import { api, requireUser, logout } from "./api.js";
import { mountNav } from "./nav.js";

const classStatsBody = document.getElementById("classStatsBody");
const failList = document.getElementById("failList");
const excellentList = document.getElementById("excellentList");

// 加载班级统计表
async function loadClassStats() {
  try {
    const res = await api("/scores/stats/class");

    if (res.data.length === 0) {
      classStatsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">暂无数据</td></tr>`;
      return;
    }

    classStatsBody.innerHTML = "";
    res.data.forEach((item) => {
      const tr = document.createElement("tr");

      // 【修复】强制转换为数字进行比较，并直接使用内联样式
      const isLowRate = Number(item.pass_rate) < 60;
      const rateColor = isLowRate ? "#ff4444" : "inherit";
      const rateWeight = isLowRate ? "bold" : "normal";

      tr.innerHTML = `
        <td>${item.class_name}</td>
        <td>${item.subject}</td>
        <td>${item.total_students}</td>
        <td>${item.avg_score}</td>
        <td>${item.max_score}</td>
        <td>${item.min_score}</td>
        <td style="color: ${rateColor}; font-weight: ${rateWeight};">${item.pass_rate}%</td>
      `;
      classStatsBody.appendChild(tr);
    });
  } catch (error) {
    classStatsBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">加载失败: ${error.message}</td></tr>`;
  }
}

// 加载名单列表
async function loadLists() {
  try {
    const res = await api("/scores/stats/lists");

    if (res.fail.length === 0) {
      failList.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">太棒了！没有不合格学生</p>`;
    } else {
      failList.innerHTML = "";
      res.fail.forEach((student) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `
          <span>${student.name} <small style="color:#888;">(${student.class_name})</small></span>
          <span>${student.subject}：<span style="color:#ff4444; font-weight:bold;">${student.score}</span></span>
        `;
        failList.appendChild(div);
      });
    }

    if (res.excellent.length === 0) {
      excellentList.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">暂无优秀学生</p>`;
    } else {
      excellentList.innerHTML = "";
      res.excellent.forEach((student) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `
          <span>${student.name} <small style="color:#888;">(${student.class_name})</small></span>
          <span>${student.subject}：<span style="color:#00cc66; font-weight:bold;">${student.score}</span></span>
        `;
        excellentList.appendChild(div);
      });
    }
  } catch (error) {
    failList.innerHTML = `<p style="color:red; text-align:center;">加载失败: ${error.message}</p>`;
    excellentList.innerHTML = `<p style="color:red; text-align:center;">加载失败: ${error.message}</p>`;
  }
}

// 初始化页面
async function init() {
  const user = await requireUser();
  if (!user) return;
  mountNav(user);

  document.getElementById("authBtn").addEventListener("click", () => logout());

  loadClassStats();
  loadLists();
}

init();
