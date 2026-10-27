import { api, requireUser, logout } from "./api.js";
import { mountNav } from "./nav.js";

// --- 全局变量 ---
const tableBody = document.getElementById("scoreTableBody");
const subjectFilter = document.getElementById("subjectFilter");
const searchBtn = document.getElementById("searchBtn");
const modal = document.getElementById("scoreModal");
const addBtn = document.getElementById("addBtn");
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");
const modalError = document.getElementById("modalError");
const modalTitle = modal.querySelector("h2"); // 获取弹窗标题

let currentEditingId = null; // 记录当前正在编辑的成绩ID，null 代表是新增

// --- 加载成绩列表 ---
async function loadScores(subject = "") {
  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">加载中...</td></tr>`;
  try {
    const url = subject
      ? `/scores?subject=${encodeURIComponent(subject)}`
      : "/scores";
    const res = await api(url);

    if (res.data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">暂无数据</td></tr>`;
      return;
    }

    tableBody.innerHTML = "";
    res.data.forEach((item) => {
      const tr = document.createElement("tr");

      let scoreClass = "";
      let statusText = "及格";
      if (item.score < 60) {
        scoreClass = "score-bad";
        statusText = "不及格";
      } else if (item.score >= 90) {
        scoreClass = "score-good";
        statusText = "优秀";
      }

      // 渲染操作按钮，绑定 data 属性方便后续获取数据
      tr.innerHTML = `
        <td>${item.student_no}</td>
        <td>${item.name}</td>
        <td>${item.class_name}</td>
        <td>${item.subject}</td>
        <td class="${scoreClass}">${item.score}</td>
        <td style="color: ${item.score < 60 ? "#ff4444" : "#888"};">${statusText}</td>
        <td>
          <button class="btn btn-sm" style="background:#667eea; color:white; padding:4px 8px; margin-right:5px;" onclick="window.editScore(${item.id}, ${item.score}, '${item.name}', '${item.subject}')">编辑</button>
          <button class="btn btn-sm" style="background:#ff4444; color:white; padding:4px 8px;" onclick="window.deleteScore(${item.id})">删除</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">加载失败: ${error.message}</td></tr>`;
  }
}

// --- 弹窗控制 ---
addBtn.addEventListener("click", () => {
  currentEditingId = null; // 重置为新增模式
  modalTitle.innerHTML = '<span class="dot"></span>录入成绩';
  document.getElementById("inStudentNo").value = "";
  document.getElementById("inName").value = "";
  document.getElementById("inClass").value = "";
  document.getElementById("inSubject").value = "";
  document.getElementById("inScore").value = "";
  // 编辑时不允许修改学号等基础信息，新增时恢复可编辑
  document.getElementById("inStudentNo").disabled = false;
  document.getElementById("inName").disabled = false;
  document.getElementById("inClass").disabled = false;
  document.getElementById("inSubject").disabled = false;

  modal.style.display = "flex";
  modalError.textContent = "";
});

cancelBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// --- 提交保存（兼顾新增和修改） ---
saveBtn.addEventListener("click", async () => {
  const score = document.getElementById("inScore").value;

  if (score === "") {
    modalError.textContent = "请填写分数";
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "保存中...";

  try {
    if (currentEditingId) {
      // 修改模式
      await api(`/scores/${currentEditingId}`, {
        method: "PUT",
        body: { score: Number(score) },
      });
    } else {
      // 新增模式
      const student_no = document.getElementById("inStudentNo").value.trim();
      const name = document.getElementById("inName").value.trim();
      const class_name = document.getElementById("inClass").value.trim();
      const subject = document.getElementById("inSubject").value.trim();

      await api("/scores", {
        method: "POST",
        body: { student_no, name, class_name, subject, score: Number(score) },
      });
    }

    modal.style.display = "none";
    loadScores(subjectFilter.value);
    loadSubjects();
  } catch (error) {
    modalError.textContent = error.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "保存";
  }
});

// --- 全局函数：用于表格按钮点击 ---
// 因为使用了 innerHTML，直接在 onclick 里调用函数最方便
window.editScore = (id, currentScore, name, subject) => {
  currentEditingId = id;
  modalTitle.innerHTML = '<span class="dot"></span>修改成绩';

  // 填充弹窗数据
  document.getElementById("inName").value = name;
  document.getElementById("inSubject").value = subject;
  document.getElementById("inScore").value = currentScore;

  // 修改成绩时，学号、姓名、班级、科目通常是不允许改的，只能改分数
  document.getElementById("inStudentNo").value = "-";
  document.getElementById("inClass").value = "-";
  document.getElementById("inStudentNo").disabled = true;
  document.getElementById("inName").disabled = true;
  document.getElementById("inClass").disabled = true;
  document.getElementById("inSubject").disabled = true;

  modal.style.display = "flex";
  modalError.textContent = "";
};

window.deleteScore = async (id) => {
  if (!confirm("确定要删除这条成绩记录吗？删除后不可恢复！")) return;

  try {
    await api(`/scores/${id}`, { method: "DELETE" });
    loadScores(subjectFilter.value); // 刷新列表
  } catch (error) {
    alert("删除失败: " + error.message);
  }
};

// --- 筛选与初始化 ---
searchBtn.addEventListener("click", () => {
  loadScores(subjectFilter.value);
});

async function loadSubjects() {
  try {
    const res = await api("/scores/subjects/list");
    subjectFilter.innerHTML = '<option value="">全部科目</option>';
    res.data.forEach((subject) => {
      const option = document.createElement("option");
      option.value = subject;
      option.textContent = subject;
      subjectFilter.appendChild(option);
    });
  } catch (error) {
    console.error("加载科目失败:", error);
  }
}

async function init() {
  const user = await requireUser();
  if (!user) return;
  mountNav(user);
  document.getElementById("authBtn").addEventListener("click", () => logout());

  loadScores();
  loadSubjects();
}

init();
