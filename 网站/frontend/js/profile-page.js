import { api, requireUser, logout } from "./api.js";
import { mountNav } from "./nav.js";

const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileJoined = document.getElementById("profileJoined");
const avatar = document.getElementById("avatar");

const passwordForm = document.getElementById("passwordForm");
const oldPassword = document.getElementById("oldPassword");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const passwordError = document.getElementById("passwordError");
const passwordSuccess = document.getElementById("passwordSuccess");

async function loadProfile() {
  try {
    const user = await requireUser();
    if (!user) return;
    mountNav(user);

    // 渲染基本信息
    profileName.textContent = user.username;
    profileEmail.textContent = user.email;
    profileJoined.textContent = `加入时间：${new Date(user.createdAt).toLocaleDateString()}`;
    avatar.textContent = user.username.charAt(0).toUpperCase();
  } catch (error) {
    console.error("加载个人信息失败", error);
  }
}

// 处理修改密码
passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  passwordError.textContent = "";
  passwordSuccess.textContent = "";

  if (newPassword.value !== confirmPassword.value) {
    passwordError.textContent = "两次输入的新密码不一致";
    return;
  }

  try {
    const res = await api("/password", {
      method: "POST",
      body: { oldPassword: oldPassword.value, newPassword: newPassword.value },
    });
    passwordSuccess.textContent = res.message;
    passwordForm.reset();
  } catch (error) {
    passwordError.textContent = error.message;
  }
});

document.getElementById("authBtn").addEventListener("click", () => logout());

loadProfile();
