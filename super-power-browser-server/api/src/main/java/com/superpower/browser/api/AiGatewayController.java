package com.superpower.browser.api;

import com.superpower.browser.ai.*;
import com.superpower.browser.auth.Actor;
import com.superpower.browser.shared.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.net.*;
import java.net.http.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Streaming compatibility gateway. Only accounting metadata reaches the database. */
@RestController @RequestMapping("/api/ai/gateway/v1")
public class AiGatewayController {
    private final AiCatalog catalog;private final AiSubscriptions subscriptions;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).followRedirects(HttpClient.Redirect.NEVER).build();
    private final Semaphore capacity=new Semaphore(32);
    private static final ScheduledExecutorService DEADLINES=Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"ai-upstream-deadlines");t.setDaemon(true);return t;});
    public AiGatewayController(AiCatalog catalog,AiSubscriptions subscriptions){this.catalog=catalog;this.subscriptions=subscriptions;}
    @GetMapping("/models") Object models(@AuthenticationPrincipal Actor a){return Map.of("object","list","data",catalog.models(a));}
    @PostMapping({"/chat/completions","/responses"}) void generate(@AuthenticationPrincipal Actor a,jakarta.servlet.http.HttpServletRequest req,HttpServletResponse res)throws IOException{
        byte[] incoming=req.getInputStream().readNBytes(2*1024*1024+1);require(incoming.length<=2*1024*1024,413,"模型请求不能超过 2 MB");
        Map<String,Object>b=object(new String(incoming,StandardCharsets.UTF_8));
        a.allow("ai.use");String protocol=req.getRequestURI().endsWith("/responses")?"responses":"chat";
        String model=required(b,"model",160);var upstream=catalog.upstream(model,protocol);
        require(!Boolean.TRUE.equals(b.get("background"))&&!b.containsKey("previous_response_id"),400,"仅支持本地会话请求");
        require(!b.containsKey("n")||number(b,"n")==1,400,"每次请求仅支持一个输出");
        var body=new LinkedHashMap<>(b);body.put("model",text(upstream,"upstreamModel"));body.put("store",false);
        String tokenKey=protocol.equals("responses")?"max_output_tokens":body.containsKey("max_completion_tokens")?"max_completion_tokens":"max_tokens";
        long output=body.containsKey(tokenKey)?number(body,tokenKey):4096;require(output>0&&output<=32768,400,"输出额度范围为 1～32768");body.put(tokenKey,output);
        boolean stream=Boolean.TRUE.equals(body.get("stream"));if(stream&&protocol.equals("chat"))body.put("stream_options",Map.of("include_usage",true));
        byte[] data=json(body).getBytes(StandardCharsets.UTF_8);require(data.length<=2*1024*1024,413,"模型请求不能超过 2 MB");
        require(capacity.tryAcquire(),429,"模型服务繁忙，请稍后重试");String usageId=null;Usage usage=new Usage();boolean started=false,success=false;
        try{
            usageId=subscriptions.reserve(a,model,data.length+output);
            String suffix=protocol.equals("responses")?"/responses":"/chat/completions";
            var request=HttpRequest.newBuilder(URI.create(text(upstream,"baseUrl")+suffix)).timeout(Duration.ofMinutes(15)).header("Content-Type","application/json").header("Authorization","Bearer "+text(upstream,"apiKey")).POST(HttpRequest.BodyPublishers.ofByteArray(data)).build();
            var response=client.send(request,HttpResponse.BodyHandlers.ofInputStream());
            try(InputStream input=response.body()){
                require(response.statusCode()>=200&&response.statusCode()<300,response.statusCode()==429?429:502,"官方模型上游暂不可用（"+response.statusCode()+"）");
                started=true;res.setStatus(200);res.setHeader("Cache-Control","no-store");res.setHeader("X-Accel-Buffering","no");res.setContentType(stream?"text/event-stream;charset=UTF-8":"application/json;charset=UTF-8");
                var timer=DEADLINES.schedule(()->{try{input.close();}catch(IOException ignored){}},15,TimeUnit.MINUTES);
                try{
                    if(stream){
                        // A bounded line buffer only inspects usage; original bytes are passed through unchanged.
                        ByteArrayOutputStream line=new ByteArrayOutputStream();byte[] chunk=new byte[8192];boolean overflow=false;long bytes=0;
                        for(int n;(n=input.read(chunk))!=-1;){bytes+=n;require(bytes<=32L*1024*1024,502,"模型输出超过限制");
                            for(int i=0;i<n;i++){byte c=chunk[i];if(c=='\n'){if(!overflow)usage.event(line.toString(StandardCharsets.UTF_8));line.reset();overflow=false;}else if(line.size()<262144)line.write(c);else overflow=true;}
                            res.getOutputStream().write(chunk,0,n);res.getOutputStream().flush();
                        }
                        if(line.size()>0&&!overflow)usage.event(line.toString(StandardCharsets.UTF_8));success=usage.completed;
                    }else{byte[] result=input.readNBytes(8*1024*1024+1);require(result.length<=8*1024*1024,502,"模型输出超过限制");usage.inspect(object(new String(result,StandardCharsets.UTF_8)));res.getOutputStream().write(result);success=true;}
                }finally{timer.cancel(false);}
            }
        }catch(InterruptedException e){Thread.currentThread().interrupt();throw new BusinessException(503,"模型请求被中断");}
        finally{try{if(usageId!=null)subscriptions.settle(usageId,usage.known?usage.input:started?data.length:0,usage.known?usage.output:started?output:0,!usage.known,success);}finally{capacity.release();}}
    }
    static class Usage {
        long input,output;boolean known,completed;
        void event(String line){if(!line.startsWith("data:"))return;String json=line.substring(5).trim();if(json.equals("[DONE]")){completed=true;return;}try{inspect(object(json));}catch(RuntimeException ignored){}}
        @SuppressWarnings("unchecked") void inspect(Map<String,Object> json){
            if("response.completed".equals(text(json,"type")))completed=true;
            if(json.get("response") instanceof Map<?,?> response)inspect((Map<String,Object>)response);
            if(json.get("usage") instanceof Map<?,?> raw){var u=(Map<String,Object>)raw;Object i=u.containsKey("input_tokens")?u.get("input_tokens"):u.get("prompt_tokens"),o=u.containsKey("output_tokens")?u.get("output_tokens"):u.get("completion_tokens");if(i instanceof Number a&&o instanceof Number b&&a.longValue()>=0&&b.longValue()>=0){input=a.longValue();output=b.longValue();known=true;}}
        }
    }
}
