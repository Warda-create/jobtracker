let jobs = JSON.parse(localStorage.getItem("jobs")) || [];

// Backward compatibility: support both interviewDate and interview field names
jobs = jobs.map(job => ({
  ...job,
  interviewDate: job.interviewDate || job.interview || "",
  interview:     job.interview     || job.interviewDate || "",
}));

let currentEditId = null;
let activefilter  = "all";

const openModalBtn = document.getElementById("openModalBtn");
const searchInput  = document.getElementById("searchInput");
const jobModal     = new bootstrap.Modal(document.getElementById("jobModal"));

// ── Helpers ────────────────────────────────────────────────────────────────

function resetJobForm() {
  document.getElementById("fieldCompany").value       = "";
  document.getElementById("fieldRole").value          = "";
  document.getElementById("fieldLocation").value      = "";
  document.getElementById("fieldStatus").value        = "Applied";
  document.getElementById("fieldDate").value          = "";
  document.getElementById("fieldInterviewDate").value = "";
  document.getElementById("fieldLink").value          = "";
  document.getElementById("fieldNotes").value         = "";
}

function saveToStorage() {
  localStorage.setItem("jobs", JSON.stringify(jobs));
}

function getInterviewReminder(interviewDate) {
  if (!interviewDate) return "";

  const interview = new Date(interviewDate);
  if (isNaN(interview.getTime())) return `📆 Interview: ${interviewDate}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  interview.setHours(0, 0, 0, 0);

  const diffInDays = Math.ceil((interview - today) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "🔴 Interview Today";
  if (diffInDays === 1) return "🟡 Interview Tomorrow";
  if (diffInDays > 1 && diffInDays <= 7) return `🔵 Interview in ${diffInDays} days`;

  const formatted = interview.toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
  return `📆 Interview on ${formatted}`;
}

function getDateBadge(dateString) {
  const today       = new Date();
  const appliedDate = new Date(dateString);
  const diffInDays  = Math.floor((today - appliedDate) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Added Today";
  if (diffInDays === 1) return "Added yesterday";
  if (diffInDays < 7)  return `Added ${diffInDays} days ago`;

  const weeks = Math.floor(diffInDays / 7);
  return `Added ${weeks} week${weeks > 1 ? "s" : ""} ago`;
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderJobs(jobList = jobs) {
  const grid            = document.getElementById("jobsGrid");
  const emptyState      = document.getElementById("emptyState");
  const progressSection = document.getElementById("progressSection");

  let filtered = jobList;

  if (activefilter !== "all") {
    filtered = filtered.filter(job => job.status === activefilter);
  }

  const query = searchInput.value.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(job =>
      job.company.toLowerCase().includes(query) ||
      job.role.toLowerCase().includes(query)
    );
  }

  const sortValue = document.getElementById("sortSelect").value;
  if (sortValue === "newest") {
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (sortValue === "oldest") {
    filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else if (sortValue === "company") {
    filtered.sort((a, b) => a.company.localeCompare(b.company));
  }

  grid.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("d-none");
    if (progressSection) progressSection.classList.add("d-none");
    return;
  }

  emptyState.classList.add("d-none");
  if (progressSection) progressSection.classList.remove("d-none");

  filtered.forEach(job => {
    const col = document.createElement("div");
    col.classList.add("col-12", "col-md-6", "col-lg-4");
    col.innerHTML = `
      <div class="card border-0 shadow-sm rounded-4 h-100 job-card">
        <div class="card-body p-3 p-md-4">
          <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
            <h6 class="fw-bold mb-0">${job.company}</h6>
            <span class="status-badge-${job.status.toLowerCase()}">${job.status}</span>
          </div>
          <p class="text-muted small mb-2">💼 ${job.role}</p>
          <p class="text-muted small mb-2">📍 ${job.location || "—"}</p>
          <p class="text-muted small mb-3">📅 ${getDateBadge(job.date)}</p>
          ${
            ["interview", "offer"].includes((job.status || "").toLowerCase().trim())
              ? `<p class="small fw-semibold text-info mb-1">${
                  (job.interviewDate || job.interview)
                    ? getInterviewReminder(job.interviewDate || job.interview)
                    : "📆 Interview date not set"
                }</p>`
              : ""
          }
          <div class="mt-2">
            <label class="form-label small mb-1">Status:</label>
            <select class="form-select form-select-sm status-change" data-id="${job.id}">
              <option value="Applied"   ${job.status === "Applied"   ? "selected" : ""}>Applied</option>
              <option value="Interview" ${job.status === "Interview" ? "selected" : ""}>Interview</option>
              <option value="Offer"     ${job.status === "Offer"     ? "selected" : ""}>Offer</option>
              <option value="Rejected"  ${job.status === "Rejected"  ? "selected" : ""}>Rejected</option>
            </select>
          </div>
        </div>
        <div class="card-footer bg-transparent border-0 pt-0 pb-3 px-3 px-md-4">
          <div class="d-flex gap-2">
            <button class="btn btn-outline-primary btn-sm flex-fill edit-btn"      data-id="${job.id}">Edit</button>
            <button class="btn btn-outline-danger btn-sm flex-fill delete-btn"     data-id="${job.id}">Delete</button>
            <button class="btn btn-outline-secondary btn-sm flex-fill copy-link-btn" data-link="${job.link}">Copy URL</button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(col);
  });

  updatestats();
}

// ── Stats & Progress ───────────────────────────────────────────────────────

function updatestats() {
  document.getElementById("countApplied").textContent   = jobs.filter(j => j.status === "Applied").length;
  document.getElementById("countInterview").textContent = jobs.filter(j => j.status === "Interview").length;
  document.getElementById("countOffer").textContent     = jobs.filter(j => j.status === "Offer").length;
  document.getElementById("countRejected").textContent  = jobs.filter(j => j.status === "Rejected").length;
  updateProgressBar();
}

function updateProgressBar() {
  const total = jobs.length || 1;
  document.getElementById("progressApplied").style.width   = (jobs.filter(j => j.status === "Applied").length   / total * 100) + "%";
  document.getElementById("progressInterview").style.width = (jobs.filter(j => j.status === "Interview").length / total * 100) + "%";
  document.getElementById("progressOffer").style.width     = (jobs.filter(j => j.status === "Offer").length     / total * 100) + "%";
  document.getElementById("progressRejected").style.width  = (jobs.filter(j => j.status === "Rejected").length  / total * 100) + "%";
}

// ── Open modal (Add mode) ──────────────────────────────────────────────────

openModalBtn.addEventListener("click", function () {
  currentEditId = null;
  resetJobForm();
  jobModal.show();
});

// ── Save job (Add or Edit) ─────────────────────────────────────────────────

document.getElementById("saveJobBtn").addEventListener("click", function () {
  const company = document.getElementById("fieldCompany").value.trim();
  const role    = document.getElementById("fieldRole").value.trim();
  const date    = document.getElementById("fieldDate").value.trim();

  if (!company || !role || !date) {
    alert("Please fill in Company, Role, and Date.");
    return;
  }

  if (currentEditId === null) {
    const newJob = {
      id:            "job_" + Date.now(),
      company,
      role,
      location:      document.getElementById("fieldLocation").value.trim(),
      status:        document.getElementById("fieldStatus").value,
      date,
      interviewDate: document.getElementById("fieldInterviewDate").value,
      interview:     document.getElementById("fieldInterviewDate").value,
      link:          document.getElementById("fieldLink").value.trim(),
      notes:         document.getElementById("fieldNotes").value.trim(),
    };
    jobs.push(newJob);
  } else {
    const index = jobs.findIndex(j => j.id === currentEditId);
    if (index !== -1) {
      jobs[index] = {
        ...jobs[index],
        company,
        role,
        location:      document.getElementById("fieldLocation").value.trim(),
        status:        document.getElementById("fieldStatus").value,
        date,
        interviewDate: document.getElementById("fieldInterviewDate").value,
        interview:     document.getElementById("fieldInterviewDate").value,
        link:          document.getElementById("fieldLink").value.trim(),
        notes:         document.getElementById("fieldNotes").value.trim(),
      };
    }
  }

  saveToStorage();
  renderJobs();
  jobModal.hide();
  currentEditId = null;
});

// ── Card events (Edit / Delete / Copy / Status change) ─────────────────────

document.getElementById("jobsGrid").addEventListener("click", function (e) {
  // Edit
  if (e.target.classList.contains("edit-btn")) {
    const jobId    = e.target.dataset.id;
    const jobToEdit = jobs.find(j => j.id === jobId);
    if (!jobToEdit) return;

    currentEditId = jobId;
    document.getElementById("fieldCompany").value       = jobToEdit.company;
    document.getElementById("fieldRole").value          = jobToEdit.role;
    document.getElementById("fieldLocation").value      = jobToEdit.location;
    document.getElementById("fieldStatus").value        = jobToEdit.status;
    document.getElementById("fieldDate").value          = jobToEdit.date;
    document.getElementById("fieldInterviewDate").value = jobToEdit.interviewDate || jobToEdit.interview || "";
    document.getElementById("fieldLink").value          = jobToEdit.link;
    document.getElementById("fieldNotes").value         = jobToEdit.notes;
    jobModal.show();
  }

  // Delete
  if (e.target.classList.contains("delete-btn")) {
    if (!confirm("Delete this job?")) return;
    jobs = jobs.filter(j => j.id !== e.target.dataset.id);
    saveToStorage();
    renderJobs();
  }

  // Copy URL
  if (e.target.classList.contains("copy-link-btn")) {
    const link = e.target.dataset.link;
    if (!link) { alert("No link available for this job."); return; }
    navigator.clipboard.writeText(link)
      .then(() => {
        e.target.textContent = "Copied!";
        setTimeout(() => { e.target.textContent = "Copy URL"; }, 1500);
      })
      .catch(err => alert("Failed to copy link: " + err));
  }
});

// Inline status dropdown
document.getElementById("jobsGrid").addEventListener("change", function (e) {
  if (e.target.classList.contains("status-change")) {
    const index = jobs.findIndex(j => j.id === e.target.dataset.id);
    if (index !== -1) {
      jobs[index].status = e.target.value;
      saveToStorage();
      updatestats();
    }
  }
});

// ── Filter buttons ─────────────────────────────────────────────────────────

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activefilter = btn.dataset.filter;
    renderJobs();
  });
});

// ── Search / Sort / Clear ──────────────────────────────────────────────────

searchInput.addEventListener("input", renderJobs);
document.getElementById("sortSelect").addEventListener("change", renderJobs);

document.getElementById("clearAllBtn").addEventListener("click", function () {
  if (!jobs.length) return;
  if (!confirm("Delete all jobs? This cannot be undone.")) return;
  jobs = [];
  saveToStorage();
  renderJobs();
});

// ── Dark mode toggle ───────────────────────────────────────────────────────

document.getElementById("darkModeToggle").addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");
  this.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
});

// ── Initial render ─────────────────────────────────────────────────────────

renderJobs();