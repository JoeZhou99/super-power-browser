import { a as h, c as d, g as w } from "./auth.js";
import { a as l, i as y } from "./common.js";
const o = "https://api.zhanfubrowser.com/api/v1",
  g = "/bindMall/savePasskey",
  p = "/bindMall/listPasskey",
  n = function (t) {
    if (t.errorCode !== 0)
      return (
        t.errorCode === 400997 && console.error("授权已过期"),
        Promise.reject(new Error(t.message || t.msg || "Error"))
      );
    if (t.format === 1) {
      const e = t.data,
        r = y(e),
        c = JSON.parse(r);
      t.data = c;
    }
    return t;
  },
  s = async (t) => {
    const a = { "Content-Type": "application/json" },
      e = await h(),
      r = await d(),
      c = await w();
    return (
      e && (a.Authorization = "Bearer " + e),
      r && (a.browserVersion = r),
      c && (a["X-Language"] = c),
      a
    );
  },
  m = {
    async getUserInfo(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/user/getUserInfo?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getUserInfo error", e);
      }
    },
    async getUserWebPageList(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/webpage/getBindWebpageRuleV2?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getUserWebPageList error", e);
      }
    },
    async getInfoByKey(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/sundry/getInfoByKey?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getInfoByKey error", e);
      }
    },
    async getInfoByKeys(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/sundry/getInfoByKeys?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getInfoByKeys error", e);
      }
    },
    async uploadStatistics(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/statistics/click?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("uploadStatistics error", e);
      }
    },
    async getTagPages(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bindMall/getTagPages?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getTagPages error", e);
      }
    },
    async getStaticByIp(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/mall/bindMall/getAcceleratedDomain?${new URLSearchParams(t)}`, {
            headers: a,
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getStaticByIp error", e);
      }
    },
    async getCurrency(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/common/currency?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getCurrency error", e);
      }
    },
    async getTime(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/common/time?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getTime error", e);
      }
    },
    async getAdsRecommendBySite(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/safe/actionLog/GetAdsRecommendBySite?${new URLSearchParams(t)}`, {
            headers: a,
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getAdsRecommendBySite error", e);
      }
    },
    async getMallInfo(t) {
      const a = await s();
      // Let the check page distinguish missing setup data from a failed check
      // and retry the complete initialization flow.
      const r = await (
        await fetch(`${o}/mall/bindMall/getMall?${new URLSearchParams(t)}`, { headers: a })
      ).json();
      return n(r);
    },
    async saveMallJumpMethod(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bindMall/updateJumpMethod`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("saveMallJumpMethod error", e);
      }
    },
    async saveMallJumpUrls(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bindMall/updateJumpUrls`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("saveMallJumpUrls error", e);
      }
    },
    async getWebsiteList(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/ads/website/getWebsiteList?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getWebsiteList error", e);
      }
    },
    async addTagPages(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bindMall/addTagPages`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("addTagPages error", e);
      }
    },
    async getFirewall(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/mall/bindMall/getFirewall?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getFirewall error", e);
      }
    },
    async getFirewallNew(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/mall/bindMall/getFirewallV2?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getFirewallNew error", e);
      }
    },
    async getWhiteList(t) {
      const a = await s();
      try {
        return await (
          await fetch("https://cyt-browser-oss.zhanfubrowser.com/whiteList_data.json", {
            headers: a,
          })
        ).json();
      } catch (e) {
        console.log("getWhiteList error", e);
      }
    },
    async getDirectList(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/mall/bindMall/blackList?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getDirectList error", e);
      }
    },
    async getPluginInfo(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/ads/plugin/getMallPluginInfo?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getPluginInfo error", e);
      }
    },
    async getPluginInfoByChromeId(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/ads/plugin/getPluginInfo?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getPluginInfoByChromeId error", e);
      }
    },
    async getPluginList(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/ads/plugins/getMallList?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getPluginList error", e);
      }
    },
    async getBookmark(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bookmark/showBookmark?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getBookmark error", e);
      }
    },
    async inBlackList(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/mall/bindMall/inBlackList?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("inBlackList error", e);
      }
    },
    async getAuditStatus(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/epcheck/getAuditStatus?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getAuditStatus error", e);
      }
    },
    async getAuthenticationCode(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bindMall/getAuthenticationCode?${new URLSearchParams(t)}`, {
            headers: a,
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getAuthenticationCode error", e);
      }
    },
    async setAuthenticationCode(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bindMall/setAuthenticationCode`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("setAuthenticationCode error", e);
      }
    },
    async refreshToken(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/user/refreshToken?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("refreshToken error", e);
      }
    },
    async saveBookmark(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bookmark/saveBookmark`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("saveBookmark error", e);
      }
    },
    async applyWhite(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/white/apply`, { method: "POST", headers: a, body: JSON.stringify(t) })
        ).json();
        return n(r);
      } catch (e) {
        console.log("applyWhite error", e);
      }
    },
    async applyWhiteV2(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/white/applyV2`, { method: "POST", headers: a, body: JSON.stringify(t) })
        ).json();
        return n(r);
      } catch (e) {
        console.log("applyWhiteV2 error", e);
      }
    },
    async setCookie(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bindMall/setCookie`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("setCookie error", e);
      }
    },
    async reviewReason(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/white/reviewReason`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("reviewReason error", e);
      }
    },
    async reviewReasonV2(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/white/reviewReasonV2`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("reviewReasonV2 error", e);
      }
    },
    async decryptData(t) {
      console.log("decryptData", t);
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/common/decryptData`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("decryptData error", e);
      }
    },
    async reportVerification(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bindMall/reportVerification`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("reportVerification error", e);
      }
    },
    async reportCheckForcedOffline(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bindMall/checkForcedOffline`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("reportCheckForcedOffline error", e);
      }
    },
    async setAccessStatus(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/bindMall/setAccessStatus`, {
            method: "POST",
            headers: a,
            body: JSON.stringify(t),
          })
        ).json();
        return n(r);
      } catch (e) {
        console.log("setAccessStatus error", e);
      }
    },
    async getWebpageList(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}/webpage/list?${new URLSearchParams(t)}`, { headers: a })
        ).json();
        return n(r);
      } catch (e) {
        console.log("getWebpageList error", e);
      }
    },
    async getWebpageGroupList() {
      const t = await s();
      try {
        const e = await (await fetch(`${o}/webpage/groupList?group_name=`, { headers: t })).json();
        return n(e);
      } catch (a) {
        console.log("getWebpageGroupList error", a);
      }
    },
    async saveWebpage(t) {
      const a = await s();
      a.encryption = 1;
      try {
        const e = JSON.stringify(t || {}),
          r = l(e),
          i = await (
            await fetch(`${o}/webpage/save`, {
              method: "POST",
              headers: a,
              body: JSON.stringify({ data: r }),
            })
          ).json();
        return n(i);
      } catch (e) {
        console.log("reportVerification error", e);
      }
    },
    async batchSaveUrl(t) {
      const a = await s();
      a.encryption = 1;
      try {
        const e = JSON.stringify(t || {}),
          r = l(e),
          i = await (
            await fetch(`${o}/domainUrl/batchSave`, {
              method: "POST",
              headers: a,
              body: JSON.stringify({ data: r }),
            })
          ).json();
        return n(i);
      } catch (e) {
        console.log("batchSaveUrl error", e);
      }
    },
    async savePasskey(t) {
      const a = await s();
      try {
        const r = await (
          await fetch(`${o}${g}`, { method: "POST", headers: a, body: JSON.stringify(t) })
        ).json();
        return n(r);
      } catch (e) {
        console.log("savePasskey error", e);
      }
    },
    async listPasskey(t) {
      const a = await s();
      try {
        const r = await (await fetch(`${o}${p}?${new URLSearchParams(t)}`, { headers: a })).json();
        return n(r);
      } catch (e) {
        console.log("listPasskey error", e);
      }
    },
    async transferSpeed(t) {
      const a = await s();
      a.encryption = 1;
      try {
        const e = JSON.stringify(t || {}),
          r = l(e),
          i = await (
            await fetch(`${o}/mall/bindMall/transferSpeed`, {
              method: "POST",
              headers: a,
              body: JSON.stringify({ data: r }),
            })
          ).json();
        return n(i);
      } catch (e) {
        console.log("transferSpeed error", e);
      }
    },
    async updateMainTransfer(t) {
      const a = await s();
      a.encryption = 1;
      try {
        const e = JSON.stringify(t || {}),
          r = l(e),
          i = await (
            await fetch(`${o}/mall/bindMall/updateMainTransfer`, {
              method: "POST",
              headers: a,
              body: JSON.stringify({ data: r }),
            })
          ).json();
        return n(i);
      } catch (e) {
        console.log("batchSaveUrl error", e);
      }
    },
  };
export { m };
