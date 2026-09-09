// ===== Route Guard =====
(function () {
  const token = localStorage.getItem("authToken");
  const hasCookie = document.cookie.includes("authToken");

  if (!token && !hasCookie) {
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = "لطفاً ابتدا وارد شوید";
      toast.className = "toast show error";
      setTimeout(() => toast.classList.remove("show"), 3000);
    }
    setTimeout(() => window.location.replace("/login"), 500);
    return;
  }
  console.log("✅ کاربر احراز هویت شد");
})();

// ===== API WRAPPER =====
// ===== API WRAPPER با پشتیبانی از چند سرویس =====
(function () {
  // آدرس پایه اصلی سرور
  const API_BASE_URL = "http://localhost:8080";

  // تعریف مسیر هر سرویس (فقط path، بدون دامنه)
  // مثال: API_BASE_URL + SERVICES.auth + "/login" => http://localhost:8080/auth/login
  const SERVICES = {
    profile: "/profile",
    myReports: "/report/myReports",
    newreports: "/reports",

    // مسیرهای دارای شناسه
    editereport: "/reports/{id}",
    deletereports: "/reports/{id}",

    myDepartments: "/myDepartments",
    // departments: "/myDepartments",
    testapi: "/reports/check",

    // ===== سرویس احراز هویت =====
    auth: "/auth",
  };

  window.API = {
    BASE_URL: API_BASE_URL,
    SERVICES: SERVICES,

    getToken() {
      return localStorage.getItem("authToken") || null;
    },

    setToken(token) {
      localStorage.setItem("authToken", token);
    },

    clearToken() {
      localStorage.removeItem("authToken");
    },

    // ساخت آدرس کامل از روی نام سرویس + endpoint
    buildUrl(service, endpoint = "") {
      const servicePath = SERVICES[service];
      if (servicePath === undefined) {
        throw new Error(`سرویس ${service} تعریف نشده است`);
      }
      return `${API_BASE_URL}${servicePath}${endpoint}`;
    },

    async request(service, endpoint, options = {}) {
      const url = this.buildUrl(service, endpoint);
      return this.requestAbsolute(url, options);
    },

    get(service, endpoint, options = {}) {
      return this.request(service, endpoint, {
        ...options,
        method: "GET",
      });
    },

    post(service, endpoint, body, options = {}) {
      return this.request(service, endpoint, {
        ...options,
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    put(service, endpoint, body, options = {}) {
      return this.request(service, endpoint, {
        ...options,
        method: "PUT",
        body: JSON.stringify(body),
      });
    },

    delete(service, endpoint, options = {}) {
      return this.request(service, endpoint, {
        ...options,
        method: "DELETE",
      });
    },
    putAbsolute(url, body, options = {}) {
      return this.requestAbsolute(url, {
        ...options,
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    async requestAbsolute(url, options = {}) {
      const token = this.getToken();

      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        this.clearToken();
        document.cookie =
          "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

        window.dispatchEvent(new CustomEvent("unauthorized"));
        throw new Error("جلسه شما منقضی شده است");
      }

      return response;
    },

    deleteAbsolute(url, options = {}) {
      return this.requestAbsolute(url, {
        ...options,
        method: "DELETE",
      });
    },

    // ===== متدهای راحت برای هر سرویس =====
    reports: {
      // دریافت همه گزارش‌های کاربر
      // GET http://localhost:8080/report/myReports
      getAll: () => {
        return window.API.get("myReports", "");
      },
      getOne: (id) => {
        if (id === null || id === undefined || id === "") {
          throw new Error("شناسه گزارش برای دریافت جزئیات مشخص نشده است");
        }
        const endpoint = SERVICES.editereport.replace(
          "{id}",
          encodeURIComponent(id),
        );
        const url = `${API_BASE_URL}${endpoint}`;
        return window.API.requestAbsolute(url, { method: "GET" });
      },
      // ایجاد گزارش جدید
      // POST http://localhost:8080/reports
      create: (data) => {
        return window.API.post("newreports", "", data);
      },

      // ویرایش گزارش مشخص
      // PUT http://localhost:8080/reports/{id}
      update: (id, data) => {
        if (id === null || id === undefined || id === "") {
          throw new Error("شناسه گزارش برای ویرایش مشخص نشده است");
        }

        const endpoint = SERVICES.editereport.replace(
          "{id}",
          encodeURIComponent(id),
        );

        const url = `${API_BASE_URL}${endpoint}`;
        return window.API.putAbsolute(url, data);
      },

      delete: (id) => {
        if (id === null || id === undefined || id === "") {
          throw new Error("شناسه گزارش برای حذف مشخص نشده است");
        }

        const endpoint = SERVICES.deletereports.replace(
          "{id}",
          encodeURIComponent(id),
        );

        const url = `${API_BASE_URL}${endpoint}`;
        return window.API.deleteAbsolute(url);
      },

      // حذف گزارش مشخص
      // DELETE http://localhost:8080/reports/{id}
    },

    myDepartments: {
      getAll: () => window.API.get("myDepartments", ""),
      getOne: (id) => window.API.get("myDepartments", `/${id}`),
      create: (data) => window.API.post("myDepartments", "", data),
      update: (id, data) => window.API.put("myDepartments", `/${id}`, data),
      delete: (id) => window.API.delete("myDepartments", `/${id}`),
    },

    // ===== سرویس احراز هویت =====
    // API.auth => API_BASE_URL + "/auth"
    // مثال: window.API.auth.login(data) => POST /auth/login
    auth: {
      login: (data) => window.API.post("auth", "/login", data),
      register: (data) => window.API.post("auth", "/register", data),
      logout: () => window.API.post("auth", "/logout", {}),
      profile: () => window.API.get("auth", "/profile"),
    },
    testapi: {
      check: () => window.API.get("testapi", ""), // ← GET /reports/check
    },
  };
})();
// ===== حالت شب/روز =====
(function () {
  const themeToggle = document.getElementById("themeToggle");
  const html = document.documentElement;
  const label = themeToggle.querySelector(".theme-label");
  const icon = themeToggle.querySelector("i");

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    html.setAttribute("data-theme", "dark");
    icon.className = "fas fa-sun";
    label.textContent = "روز";
  }

  themeToggle.addEventListener("click", function () {
    const isDark = html.getAttribute("data-theme") === "dark";
    if (isDark) {
      html.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
      icon.className = "fas fa-moon";
      label.textContent = "شب";
    } else {
      html.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
      icon.className = "fas fa-sun";
      label.textContent = "روز";
    }
  });
})();

// ===== پلاگین اختصاصی Chart.js: رسم خط دقیقاً روی نوک هر میله =====
// این پلاگین به‌جای اتکا به دیتاست از نوع «line» (که در نمودار میله‌ای گروهی
// نمی‌تواند دقیقاً روی هر میله بنشیند)، مختصات واقعی هر عنصر میله را از خود
// چارت می‌خواند و نقطه/خط را دقیقاً روی وسط وجه بالایی (یا لبه انتهایی در حالت
// افقی) هر میله رسم می‌کند. بنابراین در هر دو جهت افقی و عمودی صد‌درصد دقیق است.
if (
  typeof Chart !== "undefined" &&
  !Chart.registry.plugins.get("barTopLinePlugin")
) {
  Chart.register({
    id: "barTopLinePlugin",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const style = dataset.topLine;
        if (!style) return;

        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta || meta.hidden || !meta.data.length) return;

        // مختصات دقیق نوک هر میله (وسط وجه بالایی/انتهایی)
        const points = meta.data.map((bar) => bar.getProps(["x", "y"], false));

        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.lineWidth = style.width || 3;
        ctx.strokeStyle = style.color;
        points.forEach((p, i) =>
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
        );
        ctx.stroke();

        points.forEach((p) => {
          ctx.beginPath();
          ctx.fillStyle = style.pointColor || style.color;
          ctx.arc(p.x, p.y, style.pointRadius || 5, 0, Math.PI * 2);
          ctx.fill();
          if (style.pointBorderWidth) {
            ctx.lineWidth = style.pointBorderWidth;
            ctx.strokeStyle = style.pointBorderColor || "#ffffff";
            ctx.stroke();
          }
        });

        ctx.restore();
      });
    },
  });
}

// ===== STATE =====
(function () {
  "use strict";

  let reports = [];
  let editingId = null;
  let deleteTargetId = null;
  const API_BASE = "/api/reports";

  // ===== DOM REFS =====
  const sections = {
    list: document.getElementById("section-list"),
    create: document.getElementById("section-create"),
    detail: document.getElementById("section-detail"),
  };
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  const pageTitle = document.getElementById("pageTitle");

  const reportListContainer = document.getElementById("reportListContainer");
  const detailContainer = document.getElementById("detailContainer");
  const form = document.getElementById("reportForm");
  const titleInput = document.getElementById("titleInput");
  const titleError = document.getElementById("titleError");
  const descInput = document.getElementById("descInput");
  const deptInput = document.getElementById("deptInput");
  const columnsContainer = document.getElementById("columnsContainer");
  const rowsContainer = document.getElementById("rowsContainer");
  const addColumnBtn = document.getElementById("addColumnBtn");
  const addRowBtn = document.getElementById("addRowBtn");
  const submitBtn = document.getElementById("submitBtn");
  const formTitle = document.getElementById("formTitle");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const toast = document.getElementById("toast");
  const columnsError = document.getElementById("columnsError");
  const rowsError = document.getElementById("rowsError");

  const deleteModal = document.getElementById("deleteModal");
  const deleteReportTitle = document.getElementById("deleteReportTitle");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

  let toastTimeout = null;
  let barChartInstance = null;
  let pieChartInstance = null;
  let resizeTimeout = null;

  // ===== TOAST =====
  function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.className = "toast show" + (isError ? " error" : "");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // ===== NAVIGATION =====
  function navigateTo(sectionId) {
    Object.values(sections).forEach((el) => el.classList.remove("active"));
    const target = document.getElementById("section-" + sectionId);
    if (target) target.classList.add("active");

    sidebarItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.section === sectionId);
    });

    const titles = {
      list: "لیست گزارش‌ها",
      create: editingId ? "ویرایش گزارش" : "ایجاد گزارش",
      detail: "جزئیات گزارش",
    };
    pageTitle.innerHTML = `<i class="fas ${sectionId === "list" ? "fa-list-ul" : sectionId === "create" ? "fa-edit" : "fa-eye"}"></i> ${titles[sectionId] || ""} `;
  }

  sidebarItems.forEach((item) => {
    item.addEventListener("click", function () {
      navigateTo(this.dataset.section);
    });
  });

  // ===== SYNC ROW INPUTS =====
  function syncRowInputsCount() {
    const colCount = document.querySelectorAll(
      "#columnsContainer .col-input",
    ).length;
    const rowGroups = document.querySelectorAll("#rowsContainer .row-item");

    rowGroups.forEach((rowGroup) => {
      let nameInput = rowGroup.querySelector(".row-name-input");
      const removeBtn = rowGroup.querySelector(".remove-row");
      let inputs = rowGroup.querySelectorAll(".row-input");

      if (!nameInput) {
        nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "row-name-input";
        nameInput.placeholder = "مثلا: ردیف ۱";
        nameInput.style.flex = "0.8";
        nameInput.style.minWidth = "80px";
        rowGroup.insertBefore(nameInput, inputs[0] || removeBtn);
      }

      // NOTE: querySelectorAll returns a static NodeList — its .length
      // never updates as we add/remove elements below. We track the
      // count manually to avoid an infinite loop when data (e.g. from
      // the real backend) has a row/column count mismatch.
      let count = inputs.length;

      while (count > colCount) {
        const current = rowGroup.querySelectorAll(".row-input");
        current[current.length - 1].remove();
        count--;
      }

      while (count < colCount) {
        const newInput = document.createElement("input");
        newInput.type = "text";
        newInput.className = "row-input";
        newInput.placeholder = "مقدار عددی (اعشاری مجاز)";
        newInput.value = "";
        rowGroup.insertBefore(newInput, removeBtn);
        count++;
      }

      const updatedInputs = rowGroup.querySelectorAll(".row-input");
      updatedInputs.forEach((inp, idx) => {
        inp.placeholder = `مقدار ${idx + 1} (اعشاری مجاز)`;
      });
    });
  }

  // ===== ADD COLUMN =====
  function addColumn(value = "") {
    const colInputs = document.querySelectorAll("#columnsContainer .col-input");
    if (colInputs.length >= 10) {
      showToast("حداکثر ۱۰ ستون مجاز است", true);
      return null;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "row-group";
    wrapper.innerHTML = `
                          <input type="text" class="col-input" placeholder="مثلا: ستون ${colInputs.length + 1}" value="${value}" />
                          <button type="button" class="btn-icon remove-col" title="حذف"><i class="fas fa-times-circle"></i></button>
                      `;
    columnsContainer.appendChild(wrapper);

    syncRowInputsCount();

    wrapper
      .querySelector(".remove-col")
      .addEventListener("click", function (e) {
        e.stopPropagation();
        removeColumn(wrapper);
      });

    return wrapper;
  }

  // ===== REMOVE COLUMN =====
  function removeColumn(columnElement) {
    const colInputs = document.querySelectorAll("#columnsContainer .col-input");
    if (colInputs.length <= 1) {
      showToast("حداقل یک ستون لازم است", true);
      return;
    }
    columnElement.remove();
    syncRowInputsCount();
  }

  // ===== ADD ROW =====
  function addRow(rowName = "", values = []) {
    const colCount = document.querySelectorAll(
      "#columnsContainer .col-input",
    ).length;
    const wrapper = document.createElement("div");
    wrapper.className = "row-group row-item";

    let inner = `
                          <input type="text" class="row-name-input" placeholder="مثلا: ردیف ${document.querySelectorAll(".row-item").length + 1}" value="${rowName}" style="flex:0.8; min-width:80px;" />
                      `;

    for (let i = 0; i < colCount; i++) {
      const val = values && values[i] !== undefined ? values[i] : "";
      inner += `<input type="text" class="row-input" placeholder="مقدار ${i + 1} (اعشاری مجاز)" value="${val}" />`;
    }
    inner += `<button type="button" class="btn-icon remove-row" title="حذف ردیف"><i class="fas fa-times-circle"></i></button>`;
    wrapper.innerHTML = inner;
    rowsContainer.appendChild(wrapper);

    wrapper
      .querySelector(".remove-row")
      .addEventListener("click", function (e) {
        e.stopPropagation();
        const rowItems = document.querySelectorAll("#rowsContainer .row-item");
        if (rowItems.length <= 1) {
          showToast("حداقل یک ردیف لازم است", true);
          return;
        }
        wrapper.remove();
      });
  }

  // ===== DELETE REPORT =====
  async function deleteReport(id) {
    try {
      const res = await window.API.reports.delete(id);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "خطا در حذف گزارش");
      }
      showToast("گزارش با موفقیت حذف شد");
      await fetchReports();
      return true;
    } catch (e) {
      showToast("خطا: " + e.message, true);
      return false;
    }
  }

  // ===== FETCH REPORTS =====
  async function fetchReports() {
    try {
      const res = await window.API.reports.getAll();
      if (!res.ok) throw new Error("خطا در دریافت لیست");
      const data = await res.json();
      reports = data;
      renderReportList(reports);
    } catch (e) {
      showToast("خطا در دریافت گزارش‌ها", true);
      reportListContainer.innerHTML = `<div class="empty-state">خطا در بارگذاری</div>`;
    }
  }

  // ===== تست اتصال API =====
  async function testApiConnection() {
    const testBtn = document.getElementById("testApiBtn");
    const originalHtml = testBtn.innerHTML;

    try {
      testBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> در حال تست...';
      testBtn.disabled = true;

      const startTime = Date.now();
      const res = await window.API.testapi.check(); // ← فقط این خط تغییر کرد
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (res.ok) {
        showToast(
          `✅ اتصال به API برقرار است! (${responseTime}ms) - وضعیت: ${res.status}`,
          false,
        );
        console.log("✅ تست API موفق:", {
          status: res.status,
          time: `${responseTime}ms`,
          data: await res.json(),
        });
      } else {
        showToast(
          `❌ خطا در اتصال به API! (${responseTime}ms) - وضعیت: ${res.status}`,
          true,
        );
        console.error("❌ تست API ناموفق:", {
          status: res.status,
          time: `${responseTime}ms`,
        });
      }
    } catch (error) {
      showToast(`❌ اتصال به API برقرار نیست! (${error.message})`, true);
      console.error("❌ خطای شبکه:", error);
    } finally {
      testBtn.innerHTML = originalHtml;
      testBtn.disabled = false;
    }
  }

  // ===== رویداد دکمه تست API =====
  document
    .getElementById("testApiBtn")
    .addEventListener("click", testApiConnection);

  // ===== RENDER LIST =====
  function renderReportList(reports) {
    if (!reports || reports.length === 0) {
      reportListContainer.innerHTML = `<div class="empty-state">هیچ گزارشی یافت نشد.</div>`;
      return;
    }

    let html = "";
    reports.forEach((r) => {
      const deptName = r.departmentName || r.departmentId || "دپارتمان";
      html += `
                              <div class="report-item" data-id="${r.id}">
                                  <div class="info" data-id="${r.id}">
                                      <span class="title">${r.title || "بدون عنوان"}</span>
                                      <span class="meta"><i class="far fa-calendar-alt"></i> ${r.createdAt ? new Date(r.createdAt).toLocaleDateString("fa") : "---"}  •  <i class="fas fa-building"></i> ${deptName}</span>
                                  </div>
                                  <div class="actions">
                                      <button class="btn-sm btn-sm-primary edit-btn" data-id="${r.id}"><i class="fas fa-edit"></i> ویرایش</button>
                                      <button class="btn-sm btn-sm-danger delete-btn" data-id="${r.id}" data-title="${r.title || "بدون عنوان"}"><i class="fas fa-trash"></i> حذف</button>
                                  </div>
                                  <span class="badge"> ${r.id} </span>
                              </div>
                          `;
    });
    reportListContainer.innerHTML = html;

    document.querySelectorAll(".report-item .info").forEach((el) => {
      el.addEventListener("click", function () {
        const id = parseInt(this.dataset.id);
        window._lastSelectedId = id;
        const report = reports.find((r) => r.id === id);
        if (report) {
          showDetail(report);
          navigateTo("detail");
        }
      });
    });

    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const id = parseInt(this.dataset.id);
        const report = reports.find((r) => r.id === id);
        if (report) {
          loadReportForEdit(report);
          navigateTo("create");
        }
      });
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const id = parseInt(this.dataset.id);
        const title = this.dataset.title;
        openDeleteModal(id, title);
      });
    });
  }

  // ===== DELETE MODAL =====
  function openDeleteModal(id, title) {
    deleteTargetId = id;
    deleteReportTitle.textContent = title;
    deleteModal.classList.add("show");
  }

  function closeDeleteModal() {
    deleteModal.classList.remove("show");
    deleteTargetId = null;
  }

  cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  deleteModal.addEventListener("click", function (e) {
    if (e.target === this) closeDeleteModal();
  });

  confirmDeleteBtn.addEventListener("click", async function () {
    if (deleteTargetId !== null) {
      const success = await deleteReport(deleteTargetId);
      if (success) {
        closeDeleteModal();
        if (
          document.getElementById("section-detail").classList.contains("active")
        ) {
          navigateTo("list");
        }
      }
    }
  });

  // ===== SHOW DETAIL =====
  function showDetail(report) {
    if (!report) {
      detailContainer.innerHTML = `<span style="color: var(--text-muted);">گزارش یافت نشد.</span>`;
      return;
    }

    const cols = report.columns || [];
    const rows = report.rows || [];

    if (cols.length === 0 || rows.length === 0) {
      detailContainer.innerHTML = `<span style="color: var(--text-muted);">گزارش بدون داده</span>`;
      return;
    }

    let tableHtml = `<table><thead><tr><th>نام ردیف</th>`;
    cols.forEach((c) => {
      tableHtml += `<th>${c}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    rows.forEach((row) => {
      const rowName = row.name || "بی‌نام";
      const values = row.values || [];
      tableHtml += `<tr><td><strong>${rowName}</strong></td>`;
      values.forEach((val) => {
        const num = parseFloat(String(val).replace(/,/g, ""));
        tableHtml += `<td>${isNaN(num) ? val : num.toLocaleString("fa-IR")}</td>`;
      });
      tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table>`;

    detailContainer.innerHTML = `
                          <div style="display:flex; justify-content:space-between; flex-wrap:wrap; margin-bottom:8px;">
                              <strong>${report.title || "عنوان"}</strong>
                              <span style="color:#1a5fb4;">${report.departmentName || "دپارتمان"}</span>
                          </div>
                          ${report.description ? `<p style="color: var(--text-secondary); margin-bottom:0.6rem;">${report.description}</p>` : ""}
                          ${tableHtml}
                          <div class="charts-container">
                              <div class="chart-wrapper">
          <h4>📊 نمودار ترکیبی (میله + خط)</h4>
          <div class="chart-canvas-box">
              <canvas id="barChart"></canvas>
          </div>
      </div>
                              <div class="chart-wrapper">
                                  <h4>🍩 نمودار دایره‌ای</h4>
                                  <canvas id="pieChart"></canvas>
                              </div>
                          </div>
                      `;

    setTimeout(() => {
      createCharts(report);
    }, 50);
  }

  // ===== CREATE CHARTS (نسخه ترکیبی میله + خط با تشخیص عمودی/افقی) =====
  function createCharts(report) {
    if (window.barChartInstance) {
      window.barChartInstance.destroy();
      window.barChartInstance = null;
    }
    if (window.pieChartInstance) {
      window.pieChartInstance.destroy();
      window.pieChartInstance = null;
    }

    const cols = report.columns || [];
    const rows = report.rows || [];
    const rowNames = rows.map((r) => r.name || "بی‌نام");
    const numericData = rows.map((r) => r.values || []);
    const barCount = rowNames.length;

    // ===== تشخیص اندازه صفحه =====
    const windowWidth = window.innerWidth;
    let isVertical = false;

    if (windowWidth < 480) {
      isVertical = barCount >= 4;
    } else if (windowWidth < 820) {
      isVertical = barCount >= 6;
    } else if (windowWidth < 1024) {
      isVertical = barCount >= 10;
    } else {
      isVertical = false;
    }

    const barCtx = document.getElementById("barChart");
    if (barCtx && cols.length > 0 && rows.length > 0) {
      const datasets = [];
      const colorPalette = [
        {
          main: "#2a7de1",
          light: "rgba(42,125,225,0.65)",
          dark: "#1a5fb4",
          border: "rgba(42,125,225,0.9)",
        },
        {
          main: "#34d399",
          light: "rgba(52,211,153,0.65)",
          dark: "#10b981",
          border: "rgba(52,211,153,0.9)",
        },
        {
          main: "#fbbf24",
          light: "rgba(251,191,36,0.65)",
          dark: "#d97706",
          border: "rgba(251,191,36,0.9)",
        },
        {
          main: "#ef4444",
          light: "rgba(239,68,68,0.65)",
          dark: "#dc2626",
          border: "rgba(239,68,68,0.9)",
        },
        {
          main: "#a855f7",
          light: "rgba(168,85,247,0.65)",
          dark: "#9333ea",
          border: "rgba(168,85,247,0.9)",
        },
        {
          main: "#f472b6",
          light: "rgba(244,114,182,0.65)",
          dark: "#db2777",
          border: "rgba(244,114,182,0.9)",
        },
        {
          main: "#14b8a6",
          light: "rgba(20,184,166,0.65)",
          dark: "#0d9488",
          border: "rgba(20,184,166,0.9)",
        },
        {
          main: "#f97316",
          light: "rgba(249,115,22,0.65)",
          dark: "#ea580c",
          border: "rgba(249,115,22,0.9)",
        },
        {
          main: "#6366f1",
          light: "rgba(99,102,241,0.65)",
          dark: "#4f46e5",
          border: "rgba(99,102,241,0.9)",
        },
        {
          main: "#8b5cf6",
          light: "rgba(139,92,246,0.65)",
          dark: "#7c3aed",
          border: "rgba(139,92,246,0.9)",
        },
      ];

      cols.forEach((col, colIndex) => {
        const color = colorPalette[colIndex % colorPalette.length];
        const data = numericData.map((row) => {
          const val = parseFloat(String(row[colIndex] || 0).replace(/,/g, ""));
          return isNaN(val) ? 0 : val;
        });

        datasets.push({
          label: col,
          data: data,
          type: "bar",
          backgroundColor: color.light,
          borderColor: color.dark,
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
          topLine: {
            color: color.main,
            width: 3,
            pointRadius: 5,
            pointColor: color.main,
            pointBorderWidth: 2,
            pointBorderColor: "#ffffff",
          },
        });
      });

      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      const textColor = isDark ? "#e2e8f0" : "#1e293b";
      const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

      const valueAxis = {
        beginAtZero: true,
        grid: {
          color: gridColor,
          drawBorder: false,
        },
        ticks: {
          font: { size: 12 },
          color: textColor,
          callback: function (value) {
            return Number(value).toLocaleString("fa-IR");
          },
        },
      };

      const categoryAxis = {
        grid: { display: false },
        ticks: {
          font: { size: 13, weight: "bold" },
          color: textColor,
          maxRotation: isVertical ? 0 : 35,
          minRotation: 0,
        },
      };

      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: isVertical ? "y" : "x",
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: { size: 13, weight: "bold" },
              padding: 18,
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 14,
              boxHeight: 14,
              color: textColor,
            },
          },
          tooltip: {
            backgroundColor: isDark
              ? "rgba(15,23,42,0.95)"
              : "rgba(10,37,64,0.92)",
            titleColor: "#ffffff",
            bodyColor: "#e2e8f0",
            borderColor: isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(42,125,225,0.3)",
            borderWidth: 1,
            padding: 14,
            cornerRadius: 12,
            titleFont: { size: 14, weight: "bold" },
            bodyFont: { size: 13 },
            callbacks: {
              label: function (context) {
                const label = context.dataset.label || "";
                const value = isVertical ? context.parsed.x : context.parsed.y;
                return (
                  label + ": " + Number(value || 0).toLocaleString("fa-IR")
                );
              },
            },
          },
        },
        scales: isVertical
          ? { x: valueAxis, y: categoryAxis }
          : { x: categoryAxis, y: valueAxis },
        animation: {
          duration: 800,
          easing: "easeInOutQuart",
        },
      };

      barCtx.parentElement.style.height = isVertical
        ? Math.max(200, barCount * 90 + 180) + "px"
        : "420px";

      window.barChartInstance = new Chart(barCtx, {
        type: "bar",
        data: {
          labels: rowNames,
          datasets: datasets,
        },
        options: chartOptions,
      });

      const modeLabel = document.createElement("div");
      modeLabel.className = "chart-mode-label";
      const icon = isVertical ? "📱" : "📊";
      const modeText = isVertical ? "عمودی" : "افقی";
      modeLabel.textContent = `${icon} نمایش ${modeText} (${barCount} میله)`;

      const wrapperEl = barCtx.closest(".chart-wrapper");
      const oldLabel = wrapperEl.querySelector(".chart-mode-label");
      if (oldLabel) oldLabel.remove();
      wrapperEl.appendChild(modeLabel);
    } else {
      if (barCtx) {
        barCtx.parentElement.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">داده‌ای برای نمایش وجود ندارد</div>`;
      }
    }

    // ===== نمودار دایره‌ای =====
    const pieCtx = document.getElementById("pieChart");
    if (pieCtx && rows.length > 0) {
      const pieColors = [
        "#2a7de1",
        "#34d399",
        "#fbbf24",
        "#ef4444",
        "#a855f7",
        "#f472b6",
        "#14b8a6",
        "#f97316",
        "#6366f1",
        "#8b5cf6",
      ];

      const totalPerRow = numericData.map((row) => {
        let sum = 0;
        row.forEach((val) => {
          const num = parseFloat(String(val).replace(/,/g, ""));
          sum += isNaN(num) ? 0 : num;
        });
        return sum;
      });

      const hasData = totalPerRow.some((val) => val > 0);
      const pieData = hasData ? totalPerRow : [1, 1, 1];
      const pieLabels = hasData
        ? rowNames
        : ["بدون داده", "بدون داده", "بدون داده"];

      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      const textColor = isDark ? "#e2e8f0" : "#1e293b";
      const isSmallScreen = window.innerWidth < 480;

      window.pieChartInstance = new Chart(pieCtx, {
        type: "doughnut",
        data: {
          labels: pieLabels,
          datasets: [
            {
              data: pieData,
              backgroundColor: pieColors
                .slice(0, pieLabels.length)
                .map((c) => c + "DD"),
              borderColor: "#ffffff",
              borderWidth: 3,
              hoverOffset: 15,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                font: { size: isSmallScreen ? 10 : 12, weight: "bold" },
                padding: isSmallScreen ? 8 : 14,
                usePointStyle: true,
                pointStyle: "circle",
                boxWidth: isSmallScreen ? 10 : 12,
                boxHeight: isSmallScreen ? 10 : 12,
                color: textColor,
              },
            },
            tooltip: {
              backgroundColor: isDark
                ? "rgba(15,23,42,0.95)"
                : "rgba(10,37,64,0.92)",
              titleColor: "#ffffff",
              bodyColor: "#e2e8f0",
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(42,125,225,0.3)",
              borderWidth: 1,
              padding: 14,
              cornerRadius: 12,
              titleFont: { size: 13, weight: "bold" },
              bodyFont: { size: 12 },
              callbacks: {
                label: function (context) {
                  let total = context.dataset.data.reduce((a, b) => a + b, 0);
                  let percentage =
                    total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                  return (
                    context.label +
                    ": " +
                    context.parsed.toLocaleString("fa-IR") +
                    " (" +
                    percentage +
                    "%)"
                  );
                },
              },
            },
          },
          cutout: "55%",
          animation: {
            animateRotate: true,
            duration: 1000,
          },
        },
      });
    } else {
      if (pieCtx) {
        pieCtx.parentElement.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">داده‌ای برای نمایش وجود ندارد</div>`;
      }
    }
  }

  // ===== تغییر خودکار هنگام تغییر اندازه صفحه =====
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const activeSection = document.querySelector(".page-section.active");
      if (activeSection && activeSection.id === "section-detail") {
        const report = reports.find((r) => r.id === window._lastSelectedId);
        if (report) {
          createCharts(report);
        }
      }
    }, 300);
  });

  // ===== LOAD REPORT FOR EDIT =====
  function loadReportForEdit(report) {
    editingId = report.id;
    formTitle.textContent = "ویرایش گزارش";
    submitBtn.innerHTML = '<i class="fas fa-save"></i> بروزرسانی';
    cancelEditBtn.style.display = "inline-flex";

    titleInput.value = report.title || "";
    descInput.value = report.description || "";
    deptInput.value = report.departmentId || "";

    columnsContainer.innerHTML = "";
    rowsContainer.innerHTML = "";

    const cols = report.columns || [];
    if (cols.length === 0) {
      addColumn("");
    } else {
      cols.forEach((c) => addColumn(c));
    }

    const rowsData = report.rows || [];
    if (rowsData.length === 0) {
      addRow("", []);
    } else {
      rowsData.forEach((row) => {
        const name = row.name || "";
        const values = row.values || [];
        addRow(name, values);
      });
    }

    setTimeout(syncRowInputsCount, 50);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ===== SAVE REPORT =====
  async function saveReport(dto, isUpdate = false, id = null) {
    try {
      let res;
      if (isUpdate && id) {
        res = await window.API.reports.update(id, dto);
      } else {
        res = await window.API.reports.create(dto);
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "خطا در ثبت");
      }

      const data = await res.json();
      showToast(isUpdate ? "گزارش با موفقیت ثبت شد" : "گزارش بروزرسانی شد");
      await fetchReports();

      if (data.id) {
        const fullRes = await window.API.reports.getOne(data.id);
        const fullReport = await fullRes.json();
        showDetail(fullReport);
        window._lastSelectedId = data.id;
      }

      resetForm();
      navigateTo("list");
      return data;
    } catch (e) {
      showToast("خطا: " + e.message, true);
      throw e;
    }
  }

  // ===== VALIDATION =====
  function validateForm() {
    let isValid = true;

    if (!titleInput.value.trim()) {
      titleInput.classList.add("error");
      titleError.classList.add("show");
      isValid = false;
    } else {
      titleInput.classList.remove("error");
      titleError.classList.remove("show");
    }

    const colInputs = document.querySelectorAll("#columnsContainer .col-input");
    let allColsFilled = true;
    colInputs.forEach((inp) => {
      if (!inp.value.trim()) {
        inp.classList.add("error");
        allColsFilled = false;
      } else {
        inp.classList.remove("error");
      }
    });
    if (!allColsFilled) {
      columnsError.classList.add("show");
      isValid = false;
    } else {
      columnsError.classList.remove("show");
    }

    const rowNameInputs = document.querySelectorAll(
      "#rowsContainer .row-name-input",
    );
    let allRowsFilled = true;
    rowNameInputs.forEach((inp) => {
      if (!inp.value.trim()) {
        inp.classList.add("error");
        allRowsFilled = false;
      } else {
        inp.classList.remove("error");
      }
    });
    if (!allRowsFilled) {
      rowsError.classList.add("show");
      isValid = false;
    } else {
      rowsError.classList.remove("show");
    }

    return isValid;
  }

  // حذف خطاها هنگام تایپ
  titleInput.addEventListener("input", function () {
    if (this.value.trim()) {
      this.classList.remove("error");
      titleError.classList.remove("show");
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.classList.contains("col-input") && e.target.value.trim()) {
      e.target.classList.remove("error");
      columnsError.classList.remove("show");
    }
    if (
      e.target.classList.contains("row-name-input") &&
      e.target.value.trim()
    ) {
      e.target.classList.remove("error");
      rowsError.classList.remove("show");
    }
  });

  // ===== RESET FORM =====
  function resetForm() {
    editingId = null;
    formTitle.textContent = "ایجاد گزارش جدید";
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> ثبت گزارش';
    cancelEditBtn.style.display = "none";

    titleInput.value = "";
    titleInput.classList.remove("error");
    titleError.classList.remove("show");
    descInput.value = "";
    deptInput.value = "1";

    columnsContainer.innerHTML = "";
    rowsContainer.innerHTML = "";

    addColumn("");
    addColumn("");
    addRow("", ["", ""]);
    addRow("", ["", ""]);
    addRow("", ["", ""]);

    setTimeout(syncRowInputsCount, 50);
  }

  // ===== FORM SUBMIT =====
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!validateForm()) {
      showToast("لطفاً تمام فیلدهای ضروری را پر کنید", true);
      return;
    }

    const colInputs = document.querySelectorAll("#columnsContainer .col-input");
    const columns = [];
    colInputs.forEach((inp) => {
      columns.push(inp.value.trim());
    });

    const rowGroups = document.querySelectorAll("#rowsContainer .row-item");
    const rows = [];
    let rowValid = true;

    rowGroups.forEach((group) => {
      const nameInput = group.querySelector(".row-name-input");
      const inputs = group.querySelectorAll(".row-input");
      const rowVals = [];
      const rowName = nameInput ? nameInput.value.trim() : "";

      inputs.forEach((inp) => {
        const val = inp.value.trim();
        const num = parseFloat(val.replace(/,/g, ""));
        rowVals.push(isNaN(num) ? 0 : num);
      });
      if (rowVals.length !== columns.length) rowValid = false;
      rows.push({ name: rowName || "", values: rowVals });
    });

    if (!rowValid) {
      showToast("تعداد مقادیر هر ردیف باید برابر تعداد ستون‌ها باشد", true);
      return;
    }

    const dto = {
      title: titleInput.value.trim(),
      description: descInput.value.trim(),
      columns: columns,
      rows: rows,
      departmentId: parseInt(deptInput.value.trim()) || 1,
    };

    try {
      if (editingId) {
        await saveReport(dto, true, editingId);
      } else {
        await saveReport(dto, false);
      }
    } catch (err) {
      /* handled inside saveReport */
    }
  });

  // ===== CANCEL EDIT =====
  cancelEditBtn.addEventListener("click", function () {
    resetForm();
    navigateTo("list");
  });

  // ===== EVENT LISTENERS =====
  addColumnBtn.addEventListener("click", () => addColumn(""));
  addRowBtn.addEventListener("click", () => addRow("", []));

  document.addEventListener("click", function (e) {
    const removeColBtn = e.target.closest(".remove-col");
    if (removeColBtn) {
      e.preventDefault();
      e.stopPropagation();
      const columnElement = removeColBtn.closest(".row-group");
      if (columnElement) {
        removeColumn(columnElement);
      }
      return;
    }

    const removeRowBtn = e.target.closest(".remove-row");
    if (removeRowBtn) {
      e.preventDefault();
      e.stopPropagation();
      const rowElement = removeRowBtn.closest(".row-item");
      if (rowElement) {
        const rowItems = document.querySelectorAll("#rowsContainer .row-item");
        if (rowItems.length <= 1) {
          showToast("حداقل یک ردیف لازم است", true);
          return;
        }
        rowElement.remove();
      }
    }
  });

  refreshBtn.addEventListener("click", fetchReports);

  // ===== INIT =====
  fetchReports().then(() => {
    if (reports && reports.length > 0) {
      window._lastSelectedId = reports[0].id;
      showDetail(reports[0]);
    }
  });

  setTimeout(() => {
    columnsContainer.innerHTML = "";
    rowsContainer.innerHTML = "";
    addColumn("");
    addColumn("");
    addRow("", ["", ""]);
    addRow("", ["", ""]);
    addRow("", ["", ""]);
    syncRowInputsCount();
  }, 100);

  navigateTo("list");
})();

// ===== مدیریت نشست (Session Management) =====
(function () {
  const SESSION_DURATION = 2 * 60 * 60 * 1000; // ۲ ساعت به میلی‌ثانیه
  let sessionTimer = null;
  let warningTimer = null;

  // تابع نمایش Toast (اگه showToast تعریف نشده بود)
  function showToastMessage(msg, isError = false) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = "toast show" + (isError ? " error" : "");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 4000);
  }

  // تابع شروع تایمر
  function startSessionTimer() {
    clearTimeout(sessionTimer);
    clearTimeout(warningTimer);

    // بعد از ۲ ساعت، کاربر رو بیرون بینداز
    sessionTimer = setTimeout(() => {
      window.API.clearToken();
      window.dispatchEvent(new CustomEvent("unauthorized"));
      showToastMessage("⏰ مدت زمان جلسه شما به پایان رسید.", true);
      setTimeout(() => {
        window.location.replace("/login");
      }, 1500);
    }, SESSION_DURATION);
  }

  // تابع ریست کردن تایمر (هر بار که کاربر فعالیت می‌کنه)
  function resetSessionTimer() {
    const token = window.API.getToken();
    if (token) {
      startSessionTimer();
    }
  }

  // ===== شنود رویدادهای فعالیت کاربر =====
  const activityEvents = [
    "click",
    "keydown",
    "scroll",
    "mousemove",
    "touchstart",
    "keyup",
  ];
  activityEvents.forEach((event) => {
    document.addEventListener(event, resetSessionTimer);
  });

  // ===== وقتی توکن ذخیره شد (لاگین موفق)، تایمر رو شروع کن =====
  const originalSetToken = window.API.setToken;
  window.API.setToken = function (token) {
    originalSetToken.call(this, token);
    if (token) {
      startSessionTimer();
    }
  };

  // ===== وقتی توکن پاک شد، تایمر رو متوقف کن =====
  const originalClearToken = window.API.clearToken;
  window.API.clearToken = function () {
    originalClearToken.call(this);
    clearTimeout(sessionTimer);
    clearTimeout(warningTimer);
  };

  // ===== اگر کاربر از قبل توکن داشت، تایمر رو شروع کن =====
  if (window.API.getToken()) {
    startSessionTimer();
  }

  // ===== مدیریت Unauthorized (وقتی سرور ۴۰۱ برگردونه) =====
  window.addEventListener("unauthorized", function () {
    window.API.clearToken();
    showToastMessage("جلسه شما منقضی شد. لطفاً دوباره وارد شوید.", true);
    setTimeout(() => {
      window.location.replace = "/login";
    }, 1500);
  });

  console.log("✅ مدیریت نشست فعال شد (۲ ساعت)");
})();
