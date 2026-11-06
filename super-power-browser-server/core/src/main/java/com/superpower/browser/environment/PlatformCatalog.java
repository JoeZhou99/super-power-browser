package com.superpower.browser.environment;

import com.superpower.browser.shared.Db;
import java.util.*;
import org.springframework.stereotype.Service;
import static com.superpower.browser.shared.Data.*;
import static com.superpower.browser.shared.BusinessException.require;

/** Shared public site directory, independent of tenant shops and vendor services. */
@Service
public class PlatformCatalog {
    public record Site(String id,String name,String url) {}
    public record Platform(String name,List<Site> sites) {}
    public record Category(String name,List<Platform> platforms) {}
    public record Catalog(List<Category> categories) {}

    private final Db db;
    public PlatformCatalog(Db db){this.db=db;}

    /** Resolve a selected site on the server; clients do not need to supply its URL. */
    public void applySelection(Map<String,Object> input,Map<String,Object> previous){
        String siteId=text(input,"platformSiteId").trim();
        if(!input.containsKey("platformSiteId")&&previous!=null
            &&text(input,"platform").equals(text(previous,"platform"))
            &&text(input,"startUrl").equals(text(previous,"startUrl")))siteId=text(previous,"platformSiteId");
        input.put("platformSiteId",siteId);
        if(siteId.isBlank())return; // Existing imports and custom URLs remain supported.
        if(previous!=null&&siteId.equals(text(previous,"platformSiteId"))){
            // An unrelated edit must not change an existing shop's entry URL, even if the directory changes.
            input.put("platform",text(previous,"platform"));input.put("startUrl",text(previous,"startUrl"));return;
        }
        var matches=rows(db.select("SELECT platform_name,url FROM platform_site WHERE id=? AND enabled=TRUE",siteId));
        require(!matches.isEmpty(),400,"请选择有效的平台站点，该站点可能已停用");
        input.put("platform",text(matches.get(0),"platformName"));input.put("startUrl",text(matches.get(0),"url"));
    }

    public Catalog list(){
        var categories=new LinkedHashMap<String,LinkedHashMap<String,List<Site>>>();
        for(var row:rows(db.select("SELECT id,category_name,platform_name,site_name,url FROM platform_site WHERE enabled=TRUE ORDER BY sort_order,id"))){
            categories.computeIfAbsent(text(row,"categoryName"),key->new LinkedHashMap<>())
                .computeIfAbsent(text(row,"platformName"),key->new ArrayList<>())
                .add(new Site(text(row,"id"),text(row,"siteName"),text(row,"url")));
        }
        return new Catalog(categories.entrySet().stream().map(category->new Category(category.getKey(),
            category.getValue().entrySet().stream().map(platform->new Platform(platform.getKey(),List.copyOf(platform.getValue()))).toList()
        )).toList());
    }
}
