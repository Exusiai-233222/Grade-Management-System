const express = require("express");
const pool = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();

/** 1. 获取所有成绩列表（支持按科目筛选） */
router.get("/", requireLogin, async (req, res, next) => {
  try {
    const { subject } = req.query;
    let sql = `
      SELECT s.id, st.student_no, st.name, c.class_name, s.subject, s.score 
      FROM scores s
      JOIN students st ON s.student_id = st.id
      JOIN classes c ON st.class_id = c.id
    `;
    const params = [];

    if (subject) {
      sql += " WHERE s.subject = ?";
      params.push(subject);
    }
    sql += " ORDER BY c.class_name, st.student_no, s.subject";

    const [rows] = await pool.execute(sql, params);
    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/** 2. 按班级统计各科成绩（平均分、最高分、最低分、及格率） */
router.get("/stats/class", requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        c.class_name,
        s.subject,
        COUNT(*) AS total_students,
        ROUND(AVG(s.score), 2) AS avg_score,
        MAX(s.score) AS max_score,
        MIN(s.score) AS min_score,
        SUM(CASE WHEN s.score >= 60 THEN 1 ELSE 0 END) AS pass_count,
        ROUND(SUM(CASE WHEN s.score >= 60 THEN 1 ELSE 0 END) / COUNT(*) * 100, 1) AS pass_rate
      FROM scores s
      JOIN students st ON s.student_id = st.id
      JOIN classes c ON st.class_id = c.id
      GROUP BY c.class_name, s.subject
      ORDER BY c.class_name, s.subject
    `);
    res.json({ ok: true, data: rows });
  } catch (error) {
    next(error);
  }
});

/** 3. 获取不合格及优秀学生名单 */
router.get("/stats/lists", requireLogin, async (req, res, next) => {
  try {
    // 查询不及格名单
    const [failList] = await pool.execute(`
      SELECT st.name, c.class_name, s.subject, s.score 
      FROM scores s
      JOIN students st ON s.student_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE s.score < 60
    `);

    // 查询优秀名单 (>=90分)
    const [excellentList] = await pool.execute(`
      SELECT st.name, c.class_name, s.subject, s.score 
      FROM scores s
      JOIN students st ON s.student_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE s.score >= 90
    `);

    res.json({ ok: true, fail: failList, excellent: excellentList });
  } catch (error) {
    next(error);
  }
});
/** 4. 录入学生成绩（自动处理班级和学生的创建） */
router.post("/", requireLogin, async (req, res, next) => {
  const conn = await pool.getConnection(); // 使用事务保证数据一致性
  try {
    await conn.beginTransaction();

    const { student_no, name, class_name, subject, score } = req.body;

    if (
      !student_no ||
      !name ||
      !class_name ||
      !subject ||
      score === undefined
    ) {
      throw new Error("请填写完整信息");
    }

    // 1. 检查班级是否存在，不存在则自动创建
    let [classes] = await conn.execute(
      "SELECT id FROM classes WHERE class_name = ?",
      [class_name],
    );
    let class_id;
    if (classes.length === 0) {
      const [result] = await conn.execute(
        "INSERT INTO classes (class_name) VALUES (?)",
        [class_name],
      );
      class_id = result.insertId;
    } else {
      class_id = classes[0].id;
    }

    // 2. 检查学生是否存在，不存在则自动创建
    let [students] = await conn.execute(
      "SELECT id FROM students WHERE student_no = ?",
      [student_no],
    );
    let student_id;
    if (students.length === 0) {
      const [result] = await conn.execute(
        "INSERT INTO students (student_no, name, class_id) VALUES (?, ?, ?)",
        [student_no, name, class_id],
      );
      student_id = result.insertId;
    } else {
      student_id = students[0].id;
    }

    // 3. 插入成绩
    await conn.execute(
      "INSERT INTO scores (student_id, subject, score) VALUES (?, ?, ?)",
      [student_id, subject, score],
    );

    await conn.commit();
    res.status(201).json({ ok: true, message: "成绩录入成功" });
  } catch (error) {
    await conn.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    conn.release();
  }
});
/** 5. 获取所有科目列表（供前端下拉框使用） */
router.get("/subjects/list", requireLogin, async (req, res, next) => {
  try {
    // DISTINCT 关键字可以去除重复的科目
    const [rows] = await pool.execute("SELECT DISTINCT subject FROM scores");
    // 把结果转成简单的数组，比如 ["C语言", "大学物理", "高等数学"]
    const subjects = rows.map((r) => r.subject);
    res.json({ ok: true, data: subjects });
  } catch (error) {
    next(error);
  }
});
/** 6. 修改成绩（根据成绩记录的 ID） */
router.put("/:id", requireLogin, async (req, res, next) => {
  try {
    const scoreId = req.params.id;
    const { score } = req.body;

    if (score === undefined || score < 0 || score > 100) {
      return res.status(400).json({ error: "分数必须在 0-100 之间" });
    }

    const [result] = await pool.execute(
      "UPDATE scores SET score = ? WHERE id = ?",
      [score, scoreId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "未找到该成绩记录" });
    }

    res.json({ ok: true, message: "成绩修改成功" });
  } catch (error) {
    next(error);
  }
});

/** 7. 删除成绩（根据成绩记录的 ID） */
router.delete("/:id", requireLogin, async (req, res, next) => {
  try {
    const scoreId = req.params.id;
    const [result] = await pool.execute("DELETE FROM scores WHERE id = ?", [
      scoreId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "未找到该成绩记录" });
    }

    res.json({ ok: true, message: "成绩删除成功" });
  } catch (error) {
    next(error);
  }
});
module.exports = router;
