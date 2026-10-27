import { api, safeNextPage } from "./api.js";

const tabs = document.querySelectorAll(".tab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");
const loginSubmit = document.getElementById("loginSubmit");
const registerSubmit = document.getElementById("registerSubmit");

// 切换 Tab
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");

    const target = tab.dataset.tab;
    if (target === "login") {
      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
    } else {
      loginForm.classList.add("hidden");
      registerForm.classList.remove("hidden");
    }
  });
});

// 切换表单链接
document.querySelectorAll("[data-switch]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const target = e.target.dataset.switch;
    document.querySelector(`.tab[data-tab="${target}"]`).click();
  });
});

// 提交登录
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  loginSubmit.disabled = true;
  loginSubmit.textContent = "登录中...";

  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const data = await api("/login", {
      method: "POST",
      body: { username, password },
    });
    // 登录成功，跳转到成绩列表页
    window.location.href = "scores.html";
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    loginSubmit.disabled = false;
    loginSubmit.textContent = "登录";
  }
});

// 提交注册
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  registerError.textContent = "";
  registerSubmit.disabled = true;
  registerSubmit.textContent = "注册中...";

  const username = document.getElementById("registerUsername").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerPassword2").value;

  if (password !== confirmPassword) {
    registerError.textContent = "两次输入的密码不一致";
    registerSubmit.disabled = false;
    registerSubmit.textContent = "注册并进入系统";
    return;
  }

  try {
    const data = await api("/register", {
      method: "POST",
      body: { username, email, password },
    });
    // 注册成功，跳转到成绩列表页
    window.location.href = "scores.html";
  } catch (error) {
    registerError.textContent = error.message;
  } finally {
    registerSubmit.disabled = false;
    registerSubmit.textContent = "注册并进入系统";
  }
});

// 页面初始化：检查是否已经登录
async function init() {
  try {
    await api("/me");
    // 如果已登录，直接跳到成绩列表页
    window.location.href = "scores.html";
  } catch (e) {
    // 未登录，停留在登录页
  }
}
init();
