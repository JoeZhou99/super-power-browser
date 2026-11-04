(function () {
  "use strict";
  const r = { event_type: { get_dynamic_ip_warning_data: "GetDynamicIpWarningData" } },
    s =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAAARzQklUCAgICHwIZIgAAAEhSURBVBiVbY/PK4MBHMY/33ezXnNwcnJxdlDed+1KSbnIQUoUI+2GvX4cFLWi5bBm280OlOQiLVFcHNz37ug/cFVTJGyPC0vyOT499Xke8wPNI0Z5ZSGs2Ae/8NPqUCcnDtw4tEgCs8SpDqfk/pT6UnKJUzVjGiNpAH6gXcS24P7lmfGIi9wY1wZDGHvhge1YW7OqFYyiRA3AjAQiE5asDBBNLGsQB69WsrK3pidrcQwgh7l6wU79jJasSRjFISdjzA/UExZs3wvUAKgX7MrPaAvItRxubWBDXdEmlyZGgHxYtM3v3XnEuoy7zwgTBtCfVcxtcGZiUnDogAnSMi7eupl5yNp7+wxTini9VAwWAQRH9UfSnFuT//AD5f1A+b/5F5Q/a5i9hleTAAAAAElFTkSuQmCC",
    f =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAAAXNSR0IArs4c6QAAAARzQklUCAgICHwIZIgAAAUkSURBVEiJpdVLqN5HGcfx7/PM/C/vNWluTVMoTS+ElipE7MJbod5AV1qQ1qWCG1eii4oLURAXrnQtilFc6LYiKEIFQS0JrWDEniaeVJMY2hzP/Zz3ff//mfm5OD2SaNqk9VnPMx9mnh8zxv9RkuxXL8+eWp/bsxD6KpZvP/VY80sz03+v9XcKfEPypZXdewa1/+DItHrt0Ni2VfjpC1cWD92qJ74d4MIFNRf7xUfO/DF/4siM+/7QNncPBhrGmH/2vnv90rLrtxuz6hRw4R1Dv1nqHv/dpr7/6mp8bHnF/PoaLHahDsaxw/6jf6xq55FjUceG5dqt+u1OkOf/1n9wedN/IePAbAEvXTZeWhbzLSPNIZdCM0ycftD06XfHFx8/0X3m/uODSzfucdsZnVvVgWtzO+OVTatobCf457ygaFgEjxDc2d2JvLCU+cnZ9J6La/Vz17Z09G1Baxvpq51xsgkwS+LyLsxkhAHEsagn0Axh0AJW2cXXxa8v6NGN7fzNO4b+emXz8Fqyz49rw5BtJ1hPECO0LWrHpnqC4gSaiTEYBhSjvbIKV7d5Zl2667aQJFth9CXcjtRuZIzNBAmjrkXTiKYV9VC0I9GMoB1DO3JSgPW5Tbr19K79/d40dUsrjLcKnxtGTFm2EOwmqFy0leEY0SEFkaNJvUxFFINR6+AymR29LbSRyhfB7mmD2C0wTyDB0A0iVGDJoHdTykLBUBEW4PC4MKyN3pi/JfTydZ1Y6fOXB5VMcnIWfdpbPHTwaHSINyD6DCpIxSxGcXxoNmksB0+vvikkyf+8kr+TxdHajHmWpQRko3WBgyMqILvRR0gZcgEVMayMYyMxrrXdjuurt4QkhUvr6WtdtmeQMeth1sGiB5doAYJwQQyQDWpBMigYCA404sjINKq5ehA2b4Ik2fImn/3Lv/QFE0+4ZJ6hJIMsIjDwvYwGQRVFKtA5ZDll7zRmDocGxsEWmmi/N7NyE3R5h4/Pu/zDQqkdA4wi0SWx6AqWYRKNUTAWCXb6wqJAl42sRHKjCGJwDrcwbYxQ8tkbbytK8ksb6SsyryNmqRi5oJyhlEzJos8iF5ELuJkO1G5mTpfEPIuuQJaI0bmrNSYVaqycvwla2uV4n+xDfYIuGX2BvmCzDFnGXpoLjnCTspw+ZcwSlRvTJhAcugyKxsFWDCJ9qKvXboT81JDXS+FPQTCORuNGLIVBFFUwrDJCE1BwoptFy1Z5winkXNhZ9My7jkNDceqwuHcMg6BUtcxugswsbc62P1lV+cdmJaWcABEojGNhWsGoDlRNRapqYlvhIVKbqJEihZLF9Y3M5bVEIDOpFEZQ3wj95z+S5Msbiw/3C319Y5bf3xdCwTEztnPFbmf0ZS8kolB7IaeikBKl7A0vhsB4EHj4aCgnhvFTbWvP/Q+0X89L8aHNxce2drpntzt9oIpV7NSwNoe+GDlDFoRQGIRMkpFzkVIxpzBsA0cmlY6PdP7YOL7XzLpbQvt17ty56tD9j542i99apPDR1Xlmnt1S2Yt/FTOhJAzDHMydXPYe3UPDqGnD1kj+4HRqK28J7dff1+cPUMKLO4sy3U17EV+UYG49FOFuRHeqEKii06kwrV2jSlfnK5cfPnny5Jw7+WHvO9BcKuLpGO1sW4Vtd3+lL/rupNaZNnK+Db6oAnIXhhEwNrtCypzdR+7oRPv1cymcvki8coX85JOWeONtXFrh7ibkJ4ryI2bh+DwzdLOtuvbvPTC1pf3+fwPZCrLtEl1eTwAAAABJRU5ErkJggg==",
    i = "zf-helper-dynamic-ip-warning",
    p = "zf-helper-dynamic-ip-warning-style",
    o = "zf_dynamic_ip_warning_hidden";
  function m() {
    if (document.getElementById(p)) return;
    const t = document.createElement("style");
    ((t.id = p),
      (t.textContent = `
#${i} {
  position: fixed;
  top: 40vh;
  right: 0;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
  color: #303133;
}
#${i}, #${i} * {
  box-sizing: border-box;
}
#${i} .zf-dynamic-ip-card {
  position: relative;
  width: 294px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
#${i} .zf-dynamic-ip-dismiss {
  position: absolute;
  top: -8px;
  right: 0;
  z-index: 2;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 50%;
  padding: 0;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  color: #8c8c8c;
  cursor: pointer;
  font-size: 14px;
  line-height: 18px;
  text-align: center;
}
#${i} .zf-dynamic-ip-dismiss:hover {
  color: #303133;
}
#${i} .zf-dynamic-ip-dismiss-menu {
  display: none;
  position: absolute;
  top: 14px;
  right: 4px;
  z-index: 3;
  min-width: 96px;
  padding: 4px 0;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.16);
}
#${i}.zf-dynamic-ip-menu-open .zf-dynamic-ip-dismiss-menu {
  display: block;
}
#${i} .zf-dynamic-ip-dismiss-option {
  display: block;
  width: 100%;
  height: 30px;
  border: 0;
  padding: 0 12px;
  background: transparent;
  color: #303133;
  cursor: pointer;
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
}
#${i} .zf-dynamic-ip-dismiss-option:hover {
  background: #f5f7fa;
  color: #2f6df6;
}
#${i} .zf-dynamic-ip-title {
  width: 50px;
  height: 41px;
  border: 0;
  padding: 0 4px;
  padding-right: 8px;
  background: #fff;
  border-radius: 21px 0px 0px 21px;
  box-shadow: 0px 4px 10px 0px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  overflow: hidden;
  cursor: pointer;
  font-size: 14px;
  line-height: 22px;
  color: #303133;
  transition: width 0.18s ease;
  white-space: nowrap;
}
#${i}:hover .zf-dynamic-ip-title,
#${i}.zf-dynamic-ip-open .zf-dynamic-ip-title {
  width: 250px;
}
#${i} .zf-dynamic-ip-icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 35px;
  height: 35px;
  background: #EBF6FF;
  border-radius: 50%;
  background: linear-gradient(135deg, #eaf4ff 0%, #f7fbff 100%);
}
#${i} .zf-dynamic-ip-icon img {
  display: block;
  width: 26px;
  height: 26px;
  object-fit: contain;
}
#${i} .zf-dynamic-ip-title-text,
#${i} .zf-dynamic-ip-arrow {
  opacity: 0;
  transition: opacity 0.12s ease;
}
#${i}:hover .zf-dynamic-ip-title-text,
#${i}:hover .zf-dynamic-ip-arrow,
#${i}.zf-dynamic-ip-open .zf-dynamic-ip-title-text,
#${i}.zf-dynamic-ip-open .zf-dynamic-ip-arrow {
  opacity: 1;
}
#${i} .zf-dynamic-ip-title-text {
  flex: 1;
}
#${i} .zf-dynamic-ip-arrow {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  transform: rotate(0deg);
  transition: opacity 0.12s ease, transform 0.18s ease;
}
#${i} .zf-dynamic-ip-arrow img {
  display: block;
  width: 10px;
  object-fit: contain;
}
#${i}.zf-dynamic-ip-open .zf-dynamic-ip-arrow {
  transform: rotate(180deg);
}
#${i} .zf-dynamic-ip-dropdown {
  display: none;
  width: 294px;
  margin-top: 8px;
  padding: 14px 16px 16px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.16);
}
#${i}.zf-dynamic-ip-open .zf-dynamic-ip-dropdown {
  display: block;
}
#${i} .zf-dynamic-ip-content {
  padding: 12px 14px;
  background: #f7f8fa;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #4b5563;
}
#${i} .zf-dynamic-ip-content p {
  margin: 0 0 6px;
}
#${i} .zf-dynamic-ip-content p:last-child {
  margin-bottom: 0;
}
#${i} .zf-dynamic-ip-content strong {
  color: #303133;
}
  #${i} .zf-dynamic-ip-footer{
    font-size: 12px;
    color: #595959;
    text-align: center;
    margin-top: 10px;
  }
#${i} .zf-dynamic-ip-button {
  display: block;
  width: 176px;
  height: 36px;
  margin: 16px auto 0;
  border: 0;
  border-radius: 2px;
  background: #2f6df6;
  color: #fff;
  font-size: 14px;
  line-height: 36px;
  text-align: center;
  cursor: pointer;
}
#${i} .zf-dynamic-ip-button:hover {
  background: #1f5de8;
}
`),
      document.documentElement.appendChild(t));
  }
  function l() {
    return new Promise((t) => {
      chrome.storage.local.get({ [o]: !1 }, (n) => {
        t(!!(n != null && n[o]));
      });
    });
  }
  function y() {
    return new Promise((t) => {
      chrome.storage.local.set({ [o]: !0 }, () => t());
    });
  }
  function g(t) {
    if (document.getElementById(i)) return;
    m();
    const n = document.createElement("div");
    ((n.id = i),
      (n.innerHTML = `
    <div class="zf-dynamic-ip-card">
      <button class="zf-dynamic-ip-dismiss" type="button" aria-label="关闭提示">×</button>
      <div class="zf-dynamic-ip-dismiss-menu">
        <button class="zf-dynamic-ip-dismiss-option" type="button" data-action="close">关闭</button>
        <button class="zf-dynamic-ip-dismiss-option" type="button" data-action="never">不再展示</button>
      </div>
      <button class="zf-dynamic-ip-title" type="button" aria-expanded="false">
        <span class="zf-dynamic-ip-icon" aria-hidden="true">
          <img src="${f}" alt="" />
        </span>
        <span class="zf-dynamic-ip-title-text">遇网络异常？尝试下面操作</span>
        <span class="zf-dynamic-ip-arrow" aria-hidden="true">
          <img src="${s}" alt="" />
        </span>
      </button>
      <div class="zf-dynamic-ip-dropdown">
        <div class="zf-dynamic-ip-content">
          <p>说明：此展示不判断您当前网络是否正常，仅在您遇到现象时供自助参考。</p>
          <p><strong>建议您按顺序尝试：</strong></p>
          <p>1. 关闭当前访问店铺。</p>
          <p>2. 打开工作台，打开店铺管理-动态住宅设置，点击立即切换网络按钮。</p>
          <p>3. 点击【打开店铺】，重新进行访问。</p>
        </div>
        <div class="zf-dynamic-ip-footer">仍无法解决？请联系客服进行处理。</div>
      </div>
    </div>
  `));
    const d = n.querySelector(".zf-dynamic-ip-dismiss");
    (d == null ||
      d.addEventListener("click", (e) => {
        (e.stopPropagation(), n.classList.toggle("zf-dynamic-ip-menu-open"));
      }),
      n.querySelectorAll(".zf-dynamic-ip-dismiss-option").forEach((e) => {
        e.addEventListener("click", async (x) => {
          (x.stopPropagation(), e.dataset.action === "never" && (await y()), n.remove());
        });
      }));
    const a = n.querySelector(".zf-dynamic-ip-title");
    (a == null ||
      a.addEventListener("click", () => {
        const e = n.classList.toggle("zf-dynamic-ip-open");
        a.setAttribute("aria-expanded", String(e));
      }),
      document.addEventListener(
        "click",
        (e) => {
          n.contains(e.target) || n.classList.remove("zf-dynamic-ip-menu-open");
        },
        !0,
      ),
      document.documentElement.appendChild(n));
  }
  async function c() {
    window.top === window.self &&
      ((await l()) ||
        chrome.runtime.sendMessage({ type: r.event_type.get_dynamic_ip_warning_data }, (t) => {
          chrome.runtime.lastError || !(t != null && t.show) || !t.mallid || g(t.mallid);
        }));
  }
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", c, { once: !0 })
    : c();
})();
