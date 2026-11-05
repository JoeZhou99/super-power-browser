package com.superpower.browser.runtime;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix="app.kernels")
public class KernelSettings {
    private String localRoot="", publisherIds="", bucket="", endpoint="", region="us-east-1", prefix="kernels";
    private boolean pathStyle=false, allowHttp=false;
    private int urlMinutes=15;
    public String getLocalRoot(){return localRoot;} public void setLocalRoot(String v){localRoot=v;}
    public String getPublisherIds(){return publisherIds;} public void setPublisherIds(String v){publisherIds=v;}
    public String getBucket(){return bucket;} public void setBucket(String v){bucket=v;}
    public String getEndpoint(){return endpoint;} public void setEndpoint(String v){endpoint=v;}
    public String getRegion(){return region;} public void setRegion(String v){region=v;}
    public String getPrefix(){return prefix;} public void setPrefix(String v){prefix=v;}
    public boolean isPathStyle(){return pathStyle;} public void setPathStyle(boolean v){pathStyle=v;}
    public boolean isAllowHttp(){return allowHttp;} public void setAllowHttp(boolean v){allowHttp=v;}
    public int getUrlMinutes(){return urlMinutes;} public void setUrlMinutes(int v){urlMinutes=v;}
}
