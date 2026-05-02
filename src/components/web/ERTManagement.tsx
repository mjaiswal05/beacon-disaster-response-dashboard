import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Pencil,
  Search,
  Shield,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ERT_STATUS_CONFIG as STATUS_CONFIG } from "../../constants/constants";
import {
  bulkCreateGroundStaff,
  createERTMember,
  deleteUser,
  getGroundStaffMembers,
  listERTMembers,
  updateERTMemberContactDetails,
  type BulkCreateGroundStaffMember,
  type ERTMemberResponse,
  type GroundStaffMember,
  type PaginationMeta,
} from "../../services/api";
import { authService } from "../../services/auth";
import { Checkbox } from "../ui/checkbox";

interface ERTManagementProps {
  onBack: () => void;
}

const PAGE_SIZE = 20;

const ROLE_CONFIG: Record<string, { color: string; label: string }> = {
  ROLE_SYS_ADMIN: { color: "#9333EA", label: "SysAdmin" },
  ROLE_ERT_MEMBER: { color: "#2563EB", label: "ERT Member" },
  ROLE_ERT_MEMBERS: { color: "#2563EB", label: "ERT Member" },
  admin: { color: "#9333EA", label: "Admin" },
};

function avatarColor(id: string): string {
  const palette = [
    "#2563EB",
    "#9333EA",
    "#FF9F0A",
    "#32D74B",
    "#FF453A",
    "#64D2FF",
  ];
  const code = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return palette[code % palette.length];
}

function avatarInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function gsDisplayName(m: GroundStaffMember): string {
  if (m.name) return m.name;
  return `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "Unknown";
}

const INPUT_CLS =
  "w-full h-10 px-3 rounded-[10px] text-white focus:outline-none placeholder-[#4a4a52] transition-all";
const INPUT_STYLE = {
  background: "#0d0d0d",
  border: "1px solid var(--secondary)",
  fontSize: "14px",
} as const;

function SelectWrapper({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: "var(--muted-foreground)" }}
        aria-hidden="true"
      />
    </div>
  );
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim().replace(/^['"]|['"]$/g, ""));
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^['"]|['"]$/g, ""));
  return result;
}

const CSV_ALIASES: Record<string, keyof BulkCreateGroundStaffMember> = {
  first_name: "first_name",
  firstname: "first_name",
  "first name": "first_name",
  last_name: "last_name",
  lastname: "last_name",
  "last name": "last_name",
  email: "email",
  email_address: "email",
  phone: "phone_number",
  phone_number: "phone_number",
  "phone number": "phone_number",
  mobile: "phone_number",
  password: "password",
  pass: "password",
};

function parseCSVMembers(text: string): {
  members: BulkCreateGroundStaffMember[];
  errors: string[];
} {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2)
    return {
      members: [],
      errors: ["File must have a header row and at least one data row."],
    };

  const header = parseCSVLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, " "),
  );
  const colMap = header.map((h) => CSV_ALIASES[h] ?? null);

  const members: BulkCreateGroundStaffMember[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, i) => {
    if (!line.trim()) return;
    const values = parseCSVLine(line);
    const m: Partial<BulkCreateGroundStaffMember> = {};
    colMap.forEach((field, ci) => {
      if (field && values[ci]) m[field] = values[ci];
    });
    const row = i + 2;
    if (!m.first_name) errors.push(`Row ${row}: missing first_name`);
    else if (!m.last_name) errors.push(`Row ${row}: missing last_name`);
    else if (!m.email) errors.push(`Row ${row}: missing email`);
    else if (!m.password) errors.push(`Row ${row}: missing password`);
    else
      members.push({
        first_name: m.first_name,
        last_name: m.last_name,
        email: m.email,
        phone_number: m.phone_number ?? "",
        password: m.password,
      });
  });

  return { members, errors };
}

function downloadCSVTemplate() {
  const csv = "first_name,last_name,email,phone_number,password\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ground_staff_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function emptyBulkMember(): BulkCreateGroundStaffMember {
  return {
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export function ERTManagement({ onBack: _onBack }: ERTManagementProps) {
  const currentUser = authService.getCurrentUser();
  const isSysAdmin =
    currentUser?.role === "ROLE_SYS_ADMIN" || currentUser?.role === "admin";
  const isERTMember = [
    "ROLE_ERT_MEMBER",
    "ROLE_ERT_MEMBERS",
    "ert_member",
    "ERT",
    "ert",
  ].includes(currentUser?.role ?? "");
  const hasAccess = isSysAdmin || isERTMember;

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"ert" | "gs">("ert");

  // ── Shared toasts ─────────────────────────────────────────────────────────
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── ERT Members state ─────────────────────────────────────────────────────
  const [members, setMembers] = useState<ERTMemberResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    page_size: PAGE_SIZE,
    total_items: 0,
    total_pages: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── ERT Add modal ─────────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addForm, setAddForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    password: "",
    temporary_password: false,
  });

  // ── ERT Edit modal ────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<ERTMemberResponse | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    status: "ACTIVE",
  });

  // ── ERT Delete modal ──────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] =
    useState<ERTMemberResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Ground Staff Members state ────────────────────────────────────────────
  const [gsMembers, setGsMembers] = useState<GroundStaffMember[]>([]);
  const [gsPagination, setGsPagination] = useState<PaginationMeta>({
    page: 1,
    page_size: PAGE_SIZE,
    total_items: 0,
    total_pages: 1,
  });
  const [gsCurrentPage, setGsCurrentPage] = useState(1);
  const [gsLoading, setGsLoading] = useState(false);
  const [gsSearch, setGsSearch] = useState("");
  const [gsStatusFilter, setGsStatusFilter] = useState("all");

  // ── GS Add single modal ───────────────────────────────────────────────────
  const [gsAddOpen, setGsAddOpen] = useState(false);
  const [gsAddForm, setGsAddForm] = useState<BulkCreateGroundStaffMember>(
    emptyBulkMember(),
  );
  const [gsAddShowPwd, setGsAddShowPwd] = useState(false);
  const [gsAddSubmitting, setGsAddSubmitting] = useState(false);

  // ── GS Bulk / Import modal ────────────────────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"manual" | "csv">("manual");
  const [bulkMembers, setBulkMembers] = useState<BulkCreateGroundStaffMember[]>(
    [emptyBulkMember()],
  );
  const [bulkShowPasswords, setBulkShowPasswords] = useState<boolean[]>([
    false,
  ]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [csvParseErrors, setCsvParseErrors] = useState<string[]>([]);
  const [csvParsedCount, setCsvParsedCount] = useState<number | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ERT members ─────────────────────────────────────────────────────

  const fetchMembers = useCallback(async (page: number) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await listERTMembers(page, PAGE_SIZE);
      setMembers(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Failed to load ERT members.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAccess) fetchMembers(currentPage);
  }, [currentPage, hasAccess, fetchMembers]);

  // ── Fetch Ground Staff members ────────────────────────────────────────────

  const fetchGsMembers = useCallback(async (page: number) => {
    setGsLoading(true);
    setErrorMsg(null);
    try {
      const result = await getGroundStaffMembers(page, PAGE_SIZE);
      setGsMembers(result.members);
      setGsPagination(result.pagination);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Failed to load ground staff members.");
    } finally {
      setGsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAccess && activeTab === "gs") fetchGsMembers(gsCurrentPage);
  }, [activeTab, gsCurrentPage, hasAccess, fetchGsMembers]);

  // ── ERT Members - derived ─────────────────────────────────────────────────

  const ertStats = useMemo(
    () => ({
      total: pagination.total_items,
      active: members.filter((m) => m.status === "ACTIVE").length,
      inactive: members.filter((m) => m.status === "INACTIVE").length,
      recent: members.filter(
        (m) =>
          Date.now() - new Date(m.created_at).getTime() <
          30 * 24 * 60 * 60 * 1000,
      ).length,
    }),
    [members, pagination.total_items],
  );

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, searchQuery, statusFilter]);

  // ── Ground Staff - derived ────────────────────────────────────────────────

  const gsStats = useMemo(
    () => ({
      total: gsPagination.total_items,
      active: gsMembers.filter((m) => m.status === "ACTIVE").length,
      inactive: gsMembers.filter((m) => m.status === "INACTIVE").length,
      recent: gsMembers.filter(
        (m) =>
          Date.now() - new Date(m.created_at).getTime() <
          30 * 24 * 60 * 60 * 1000,
      ).length,
    }),
    [gsMembers, gsPagination.total_items],
  );

  const filteredGsMembers = useMemo(() => {
    const q = gsSearch.toLowerCase();
    return gsMembers.filter((m) => {
      const name = gsDisplayName(m).toLowerCase();
      const matchesSearch =
        !q ||
        name.includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q);
      const matchesStatus =
        gsStatusFilter === "all" || m.status === gsStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [gsMembers, gsSearch, gsStatusFilter]);

  // ── ERT handlers ─────────────────────────────────────────────────────────

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSysAdmin) return;
    setIsSubmitting(true);
    try {
      await createERTMember(addForm);
      setSuccessMsg(
        `ERT member ${addForm.first_name} ${addForm.last_name} created successfully!`,
      );
      setShowAdd(false);
      setAddForm({
        email: "",
        first_name: "",
        last_name: "",
        phone_number: "",
        password: "",
        temporary_password: false,
      });
      fetchMembers(currentPage);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Failed to create ERT member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (m: ERTMemberResponse) => {
    const parts = (m.name ?? "").trim().split(/\s+/);
    setMemberToEdit(m);
    setEditForm({
      first_name: parts[0] ?? "",
      last_name: parts.length > 1 ? parts.slice(1).join(" ") : "",
      email: m.email ?? "",
      phone_number: m.phone_number ?? "",
      status: m.status ?? "ACTIVE",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToEdit || !isSysAdmin) return;
    setIsUpdating(true);
    try {
      await updateERTMemberContactDetails(memberToEdit.id, editForm);
      setSuccessMsg(`${memberToEdit.name} updated successfully!`);
      setEditOpen(false);
      fetchMembers(currentPage);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Failed to update member.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openDelete = (m: ERTMemberResponse) => {
    setMemberToDelete(m);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete || !isSysAdmin) return;
    setIsDeleting(true);
    try {
      await deleteUser(memberToDelete.id);
      setSuccessMsg(`${memberToDelete.name} deleted successfully!`);
      setDeleteOpen(false);
      setMemberToDelete(null);
      const newPage =
        filteredMembers.length === 1 && currentPage > 1
          ? currentPage - 1
          : currentPage;
      setCurrentPage(newPage);
      fetchMembers(newPage);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Failed to delete member.");
      setDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Ground Staff handlers ─────────────────────────────────────────────────

  const handleGsAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSysAdmin) return;
    setGsAddSubmitting(true);
    try {
      await bulkCreateGroundStaff([gsAddForm]);
      setSuccessMsg(
        `${gsAddForm.first_name} ${gsAddForm.last_name} added to ground staff.`,
      );
      setGsAddOpen(false);
      setGsAddForm(emptyBulkMember());
      setGsAddShowPwd(false);
      fetchGsMembers(gsCurrentPage);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Failed to create ground staff member.");
    } finally {
      setGsAddSubmitting(false);
    }
  };

  const updateBulkMember = (
    index: number,
    field: keyof BulkCreateGroundStaffMember,
    value: string,
  ) => {
    setBulkMembers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addBulkRow = () => {
    setBulkMembers((prev) => [...prev, emptyBulkMember()]);
    setBulkShowPasswords((prev) => [...prev, false]);
  };

  const removeBulkRow = (index: number) => {
    setBulkMembers((prev) => prev.filter((_, i) => i !== index));
    setBulkShowPasswords((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleBulkPassword = (index: number) => {
    setBulkShowPasswords((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { members: parsed, errors } = parseCSVMembers(text);
      setCsvParseErrors(errors);
      if (parsed.length > 0) {
        setBulkMembers(parsed);
        setBulkShowPasswords(parsed.map(() => false));
        setCsvParsedCount(parsed.length);
        setBulkMode("manual"); // switch to manual to show preview
      } else {
        setCsvParsedCount(0);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSysAdmin) return;
    const valid = bulkMembers.filter(
      (m) => m.first_name && m.last_name && m.email && m.password,
    );
    if (valid.length === 0) return;
    setIsBulkSubmitting(true);
    try {
      await bulkCreateGroundStaff(valid);
      setSuccessMsg(
        `${valid.length} ground staff member${valid.length > 1 ? "s" : ""} created successfully.`,
      );
      setBulkOpen(false);
      setBulkMembers([emptyBulkMember()]);
      setBulkShowPasswords([false]);
      setCsvParseErrors([]);
      setCsvParsedCount(null);
      fetchGsMembers(gsCurrentPage);
    } catch (err: any) {
      setErrorMsg(err.message ?? "Failed to create ground staff members.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // ── Access guard ──────────────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(255,69,58,0.12)",
              border: "1px solid rgba(255,69,58,0.2)",
            }}
          >
            <AlertCircle className="w-7 h-7" style={{ color: "#FF453A" }} />
          </div>
          <h2
            className="text-white mb-2"
            style={{ fontSize: "20px", fontWeight: 600 }}
          >
            Access Denied
          </h2>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
            You do not have permission to access ERT Management.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-white"
            style={{ fontSize: "28px", fontWeight: 700, lineHeight: 1.2 }}
          >
            ERT Management
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted-foreground)",
              marginTop: 4,
            }}
          >
            {isSysAdmin
              ? activeTab === "ert"
                ? "Manage emergency response team members, roles, and assignments"
                : "Manage ground staff members and onboard new personnel"
              : activeTab === "ert"
                ? "View emergency response team members"
                : "View ground staff members"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSysAdmin && activeTab === "ert" && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 h-10 px-5 rounded-[12px] text-white hover:opacity-90 transition-opacity"
              style={{
                background: "#2563EB",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              Add Member
            </button>
          )}
          {isSysAdmin && activeTab === "gs" && (
            <>
              <button
                onClick={() => {
                  setBulkMembers([emptyBulkMember()]);
                  setBulkShowPasswords([false]);
                  setBulkMode("manual");
                  setCsvParseErrors([]);
                  setCsvParsedCount(null);
                  setBulkOpen(true);
                }}
                className="flex items-center gap-2 h-10 px-4 rounded-[12px] hover:opacity-90 transition-opacity"
                style={{
                  background: "#2563EB",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                Bulk Import
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Tab Switcher ──────────────────────────────────────── */}
      <div
        className="flex gap-1 p-1 rounded-[12px] w-fit"
        style={{
          background: "var(--card)",
          border: "1px solid var(--secondary)",
        }}
        role="tablist"
        aria-label="Management sections"
      >
        <button
          role="tab"
          aria-selected={activeTab === "ert"}
          onClick={() => setActiveTab("ert")}
          className="flex items-center gap-2 h-9 px-4 rounded-[9px] transition-all"
          style={{
            background: activeTab === "ert" ? "#2563EB" : "transparent",
            color: activeTab === "ert" ? "#fff" : "var(--muted-foreground)",
            fontSize: "14px",
            fontWeight: activeTab === "ert" ? 600 : 400,
          }}
        >
          <Users className="w-4 h-4" aria-hidden="true" />
          ERT Members
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "gs"}
          onClick={() => setActiveTab("gs")}
          className="flex items-center gap-2 h-9 px-4 rounded-[9px] transition-all"
          style={{
            background: activeTab === "gs" ? "#2563EB" : "transparent",
            color: activeTab === "gs" ? "#fff" : "var(--muted-foreground)",
            fontSize: "14px",
            fontWeight: activeTab === "gs" ? 600 : 400,
          }}
        >
          <FileText className="w-4 h-4" aria-hidden="true" />
          Ground Staff
        </button>
      </div>

      {/* ── Toasts ────────────────────────────────────────────── */}
      {successMsg && (
        <div
          className="flex items-center gap-3 p-4 rounded-[12px]"
          style={{
            background: "rgba(50,215,75,0.08)",
            border: "1px solid rgba(50,215,75,0.2)",
          }}
          role="status"
          aria-live="polite"
        >
          <CheckCircle2
            className="w-4 h-4 shrink-0"
            style={{ color: "#32D74B" }}
            aria-hidden="true"
          />
          <span style={{ fontSize: "14px", color: "#32D74B" }}>
            {successMsg}
          </span>
          <button
            onClick={() => setSuccessMsg(null)}
            className="ml-auto hover:opacity-70 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" style={{ color: "#32D74B" }} />
          </button>
        </div>
      )}
      {errorMsg && (
        <div
          className="flex items-center gap-3 p-4 rounded-[12px]"
          style={{
            background: "rgba(255,69,58,0.08)",
            border: "1px solid rgba(255,69,58,0.2)",
          }}
          role="alert"
          aria-live="assertive"
        >
          <XCircle
            className="w-4 h-4 shrink-0"
            style={{ color: "#FF453A" }}
            aria-hidden="true"
          />
          <span style={{ fontSize: "14px", color: "#FF453A" }}>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="ml-auto hover:opacity-70 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" style={{ color: "#FF453A" }} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ERT Members Tab
      ══════════════════════════════════════════════════════════ */}
      {activeTab === "ert" && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: "Total Personnel",
                value: ertStats.total,
                color: "#2563EB",
                Icon: Users,
              },
              {
                label: "Active Now",
                value: ertStats.active,
                color: "#32D74B",
                Icon: CheckCircle2,
              },
              {
                label: "Inactive",
                value: ertStats.inactive,
                color: "#8A8F98",
                Icon: AlertCircle,
              },
              {
                label: "New This Month",
                value: ertStats.recent,
                color: "#FF9F0A",
                Icon: Clock,
              },
            ].map(({ label, value, color, Icon }) => (
              <StatCard
                key={label}
                label={label}
                value={value}
                color={color}
                Icon={Icon}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, email or ID…"
              ariaLabel="Search members"
            />
            <SelectWrapper>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 pl-4 pr-9 rounded-[12px] text-white cursor-pointer focus:outline-none appearance-none"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--secondary)",
                  fontSize: "14px",
                  minWidth: "140px",
                }}
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </SelectWrapper>
          </div>

          <MembersTable
            rows={filteredMembers}
            isLoading={isLoading}
            columns={[
              "MEMBER",
              "EMAIL",
              "PHONE",
              "ROLE",
              "STATUS",
              "JOINED",
              "LAST UPDATED",
              ...(isSysAdmin ? ["ACTIONS"] : []),
            ]}
            emptyTitle={
              members.length === 0
                ? "No ERT members yet"
                : "No members match your search"
            }
            emptySubtitle={
              members.length === 0 && isSysAdmin
                ? "Add your first member using the button above"
                : "Try adjusting your filters"
            }
            renderRow={(m) => {
              const color = avatarColor(m.id);
              const statusCfg = STATUS_CONFIG[m.status] ?? {
                color: "var(--muted-foreground)",
                label: m.status,
              };
              const roleCfg = ROLE_CONFIG[m.role] ?? {
                color: "var(--muted-foreground)",
                label: m.role,
              };
              return (
                <tr
                  key={m.id}
                  className="transition-colors hover:bg-[#1a1a1a]"
                  style={{ borderBottom: "1px solid var(--secondary)" }}
                >
                  <td className="px-5 py-4">
                    <AvatarCell
                      id={m.id}
                      name={m.name}
                      color={color}
                    />
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {m.email || "-"}
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {m.phone_number || "-"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Shield
                        className="w-3 h-3 shrink-0"
                        style={{ color: roleCfg.color }}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: roleCfg.color,
                        }}
                      >
                        {roleCfg.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusDot color={statusCfg.color} label={statusCfg.label} />
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{
                      fontSize: "13px",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {formatDate(m.created_at)}
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{
                      fontSize: "13px",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {formatDate(m.updated_at)}
                  </td>
                  {isSysAdmin && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(m)}
                          className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors hover:bg-secondary"
                          aria-label={`Edit ${m.name}`}
                        >
                          <Pencil
                            className="w-3.5 h-3.5"
                            style={{ color: "var(--muted-foreground)" }}
                            strokeWidth={1.5}
                          />
                        </button>
                        <button
                          onClick={() => openDelete(m)}
                          className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors hover:bg-secondary"
                          aria-label={`Delete ${m.name}`}
                        >
                          <Trash2
                            className="w-3.5 h-3.5"
                            style={{ color: "var(--muted-foreground)" }}
                            strokeWidth={1.5}
                          />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            }}
          />

          <PaginationBar
            pagination={pagination}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            itemLabel="member"
            filteredCount={filteredMembers.length}
            hasActiveFilter={!!searchQuery || statusFilter !== "all"}
          />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          Ground Staff Members Tab
      ══════════════════════════════════════════════════════════ */}
      {activeTab === "gs" && (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: "Total Staff",
                value: gsStats.total,
                color: "#2563EB",
                Icon: Users,
              },
              {
                label: "Active",
                value: gsStats.active,
                color: "#32D74B",
                Icon: CheckCircle2,
              },
              {
                label: "Inactive",
                value: gsStats.inactive,
                color: "#8A8F98",
                Icon: AlertCircle,
              },
              {
                label: "New This Month",
                value: gsStats.recent,
                color: "#FF9F0A",
                Icon: Clock,
              },
            ].map(({ label, value, color, Icon }) => (
              <StatCard
                key={label}
                label={label}
                value={value}
                color={color}
                Icon={Icon}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <SearchBar
              value={gsSearch}
              onChange={setGsSearch}
              placeholder="Search by name, email or ID…"
              ariaLabel="Search ground staff"
            />
            <SelectWrapper>
              <select
                value={gsStatusFilter}
                onChange={(e) => setGsStatusFilter(e.target.value)}
                className="h-10 pl-4 pr-9 rounded-[12px] text-white cursor-pointer focus:outline-none appearance-none"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--secondary)",
                  fontSize: "14px",
                  minWidth: "140px",
                }}
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </SelectWrapper>
          </div>

          <MembersTable
            rows={filteredGsMembers}
            isLoading={gsLoading}
            columns={["MEMBER", "EMAIL", "PHONE", "STATUS", "JOINED", "LAST UPDATED"]}
            emptyTitle={
              gsMembers.length === 0
                ? "No ground staff members yet"
                : "No members match your search"
            }
            emptySubtitle={
              gsMembers.length === 0 && isSysAdmin
                ? "Add members using the buttons above"
                : "Try adjusting your filters"
            }
            renderRow={(m) => {
              const name = gsDisplayName(m);
              const color = avatarColor(m.id);
              const statusCfg = STATUS_CONFIG[m.status] ?? {
                color: "var(--muted-foreground)",
                label: m.status,
              };
              return (
                <tr
                  key={m.id}
                  className="transition-colors hover:bg-[#1a1a1a]"
                  style={{ borderBottom: "1px solid var(--secondary)" }}
                >
                  <td className="px-5 py-4">
                    <AvatarCell id={m.id} name={name} color={color} />
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {m.email || "-"}
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {m.phone_number || "-"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusDot color={statusCfg.color} label={statusCfg.label} />
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{
                      fontSize: "13px",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {formatDate(m.created_at)}
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{
                      fontSize: "13px",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {formatDate(m.updated_at)}
                  </td>
                </tr>
              );
            }}
          />

          <PaginationBar
            pagination={gsPagination}
            currentPage={gsCurrentPage}
            onPageChange={setGsCurrentPage}
            itemLabel="staff member"
            filteredCount={filteredGsMembers.length}
            hasActiveFilter={!!gsSearch || gsStatusFilter !== "all"}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          Add ERT Member Modal
      ═══════════════════════════════════════════════════════════ */}
      {showAdd && isSysAdmin && (
        <ModalOverlay onClose={() => setShowAdd(false)}>
          <ModalHeader
            icon={<UserPlus className="w-5 h-5" style={{ color: "#2563EB" }} />}
            iconBg="rgba(37,99,235,0.15)"
            title="Add ERT Member"
            subtitle="Create a new emergency response team account"
            onClose={() => setShowAdd(false)}
          />
          <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField id="add_fname" label="First Name *">
                <input
                  id="add_fname"
                  type="text"
                  required
                  value={addForm.first_name}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, first_name: e.target.value }))
                  }
                  placeholder="John"
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField id="add_lname" label="Last Name *">
                <input
                  id="add_lname"
                  type="text"
                  required
                  value={addForm.last_name}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, last_name: e.target.value }))
                  }
                  placeholder="Doe"
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField
                id="add_email"
                label="Email Address *"
                className="col-span-2"
              >
                <input
                  id="add_email"
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="member@beacon.gov"
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField
                id="add_phone"
                label="Phone Number"
                className="col-span-2"
              >
                <input
                  id="add_phone"
                  type="tel"
                  value={addForm.phone_number}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, phone_number: e.target.value }))
                  }
                  placeholder="+353 1 234 5678"
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField
                id="add_password"
                label="Password *"
                className="col-span-2"
              >
                <PasswordInput
                  id="add_password"
                  value={addForm.password}
                  onChange={(v) =>
                    setAddForm((p) => ({ ...p, password: v }))
                  }
                  show={showPassword}
                  onToggle={() => setShowPassword((s) => !s)}
                  required
                />
              </FormField>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="add_temp"
                checked={addForm.temporary_password}
                onCheckedChange={(v) =>
                  setAddForm((p) => ({ ...p, temporary_password: !!v }))
                }
              />
              <label
                htmlFor="add_temp"
                style={{
                  fontSize: "13px",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                }}
              >
                Require password change on first login
              </label>
            </div>
            <ModalActions
              submitLabel="Create Member"
              submitIcon={<UserPlus className="w-4 h-4" aria-hidden="true" />}
              isLoading={isSubmitting}
              loadingLabel="Creating…"
              onCancel={() => setShowAdd(false)}
            />
          </form>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════════════════════════
          Edit ERT Member Modal
      ═══════════════════════════════════════════════════════════ */}
      {editOpen && memberToEdit && (
        <ModalOverlay onClose={() => setEditOpen(false)}>
          <ModalHeader
            icon={
              <Pencil className="w-4.5 h-4.5" style={{ color: "#FF9F0A" }} />
            }
            iconBg="rgba(255,159,10,0.15)"
            title="Edit Member"
            subtitle={`Update details for ${memberToEdit.name}`}
            onClose={() => setEditOpen(false)}
          />
          <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField id="edit_fname" label="First Name">
                <input
                  id="edit_fname"
                  required
                  value={editForm.first_name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, first_name: e.target.value }))
                  }
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField id="edit_lname" label="Last Name">
                <input
                  id="edit_lname"
                  required
                  value={editForm.last_name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, last_name: e.target.value }))
                  }
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField id="edit_email" label="Email" className="col-span-2">
                <input
                  id="edit_email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, email: e.target.value }))
                  }
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField id="edit_phone" label="Phone">
                <input
                  id="edit_phone"
                  value={editForm.phone_number}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      phone_number: e.target.value,
                    }))
                  }
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField id="edit_status" label="Status">
                <SelectWrapper>
                  <select
                    id="edit_status"
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, status: e.target.value }))
                    }
                    className="w-full h-10 pl-3 pr-9 rounded-[10px] text-white cursor-pointer focus:outline-none appearance-none"
                    style={INPUT_STYLE}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </SelectWrapper>
              </FormField>
            </div>
            <div
              className="pt-2 space-y-2"
              style={{ borderTop: "1px solid var(--secondary)" }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "#555",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                }}
              >
                METADATA
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p style={{ fontSize: "11px", color: "#555" }}>Member ID</p>
                  <p
                    className="font-mono truncate"
                    style={{
                      fontSize: "12px",
                      color: "var(--muted-foreground)",
                    }}
                    title={memberToEdit.id}
                  >
                    {memberToEdit.id}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "#555" }}>Last Updated</p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {formatDate(memberToEdit.updated_at)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "#555" }}>Joined</p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {formatDate(memberToEdit.created_at)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "#555" }}>Role</p>
                  <p
                    style={{
                      fontSize: "12px",
                      color:
                        ROLE_CONFIG[memberToEdit.role]?.color ??
                        "var(--muted-foreground)",
                    }}
                  >
                    {ROLE_CONFIG[memberToEdit.role]?.label ?? memberToEdit.role}
                  </p>
                </div>
              </div>
            </div>
            <ModalActions
              submitLabel="Save Changes"
              submitIcon={<Pencil className="w-4 h-4" aria-hidden="true" />}
              isLoading={isUpdating}
              loadingLabel="Saving…"
              onCancel={() => setEditOpen(false)}
            />
          </form>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════════════════════════
          Delete ERT Member Confirm Modal
      ═══════════════════════════════════════════════════════════ */}
      {deleteOpen && memberToDelete && (
        <ModalOverlay onClose={() => setDeleteOpen(false)}>
          <div className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(255,69,58,0.12)",
                  border: "1px solid rgba(255,69,58,0.2)",
                }}
              >
                <Trash2
                  className="w-5 h-5"
                  style={{ color: "#FF453A" }}
                  aria-hidden="true"
                />
              </div>
              <div>
                <h2
                  className="text-white mb-1"
                  style={{ fontSize: "18px", fontWeight: 600 }}
                >
                  Remove Member
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--muted-foreground)",
                    lineHeight: 1.6,
                  }}
                >
                  Remove{" "}
                  <span className="text-white" style={{ fontWeight: 500 }}>
                    {memberToDelete.name}
                  </span>{" "}
                  from the ERT? This will revoke their access and cannot be
                  undone.
                </p>
              </div>
            </div>
            <div
              className="flex items-center gap-3 p-3 rounded-[12px] mb-6"
              style={{
                background: "#0d0d0d",
                border: "1px solid var(--secondary)",
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: `${avatarColor(memberToDelete.id)}20`,
                  border: `1.5px solid ${avatarColor(memberToDelete.id)}40`,
                }}
              >
                <span
                  className="text-white"
                  style={{ fontSize: "12px", fontWeight: 600 }}
                >
                  {avatarInitials(memberToDelete.name)}
                </span>
              </div>
              <div className="min-w-0">
                <p
                  className="text-white truncate"
                  style={{ fontSize: "14px", fontWeight: 500 }}
                >
                  {memberToDelete.name}
                </p>
                <p
                  className="truncate"
                  style={{
                    fontSize: "12px",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {memberToDelete.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 h-10 rounded-[10px] text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: "#FF453A",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2
                      className="w-4 h-4 animate-spin"
                      aria-hidden="true"
                    />{" "}
                    Removing…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" aria-hidden="true" /> Remove
                    Member
                  </>
                )}
              </button>
              <button
                onClick={() => setDeleteOpen(false)}
                className="h-10 px-5 rounded-[10px] hover:bg-secondary transition-colors"
                style={{
                  border: "1px solid var(--secondary)",
                  fontSize: "14px",
                  color: "var(--muted-foreground)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════════════════════════
          Add Single Ground Staff Member Modal
      ═══════════════════════════════════════════════════════════ */}
      {gsAddOpen && isSysAdmin && (
        <ModalOverlay onClose={() => setGsAddOpen(false)}>
          <ModalHeader
            icon={<UserPlus className="w-5 h-5" style={{ color: "#2563EB" }} />}
            iconBg="rgba(37,99,235,0.15)"
            title="Add Ground Staff Member"
            subtitle="Create a new ground staff account"
            onClose={() => setGsAddOpen(false)}
          />
          <form onSubmit={handleGsAddSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField id="gs_fname" label="First Name *">
                <input
                  id="gs_fname"
                  type="text"
                  required
                  value={gsAddForm.first_name}
                  onChange={(e) =>
                    setGsAddForm((p) => ({ ...p, first_name: e.target.value }))
                  }
                  placeholder="Jane"
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField id="gs_lname" label="Last Name *">
                <input
                  id="gs_lname"
                  type="text"
                  required
                  value={gsAddForm.last_name}
                  onChange={(e) =>
                    setGsAddForm((p) => ({ ...p, last_name: e.target.value }))
                  }
                  placeholder="Smith"
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField
                id="gs_email"
                label="Email Address *"
                className="col-span-2"
              >
                <input
                  id="gs_email"
                  type="email"
                  required
                  value={gsAddForm.email}
                  onChange={(e) =>
                    setGsAddForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="jane.smith@org.ie"
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField
                id="gs_phone"
                label="Phone Number"
                className="col-span-2"
              >
                <input
                  id="gs_phone"
                  type="tel"
                  value={gsAddForm.phone_number}
                  onChange={(e) =>
                    setGsAddForm((p) => ({
                      ...p,
                      phone_number: e.target.value,
                    }))
                  }
                  placeholder="+353 1 234 5678"
                  className={INPUT_CLS}
                  style={INPUT_STYLE}
                />
              </FormField>
              <FormField
                id="gs_password"
                label="Password *"
                className="col-span-2"
              >
                <PasswordInput
                  id="gs_password"
                  value={gsAddForm.password}
                  onChange={(v) =>
                    setGsAddForm((p) => ({ ...p, password: v }))
                  }
                  show={gsAddShowPwd}
                  onToggle={() => setGsAddShowPwd((s) => !s)}
                  required
                />
              </FormField>
            </div>
            <ModalActions
              submitLabel="Create Member"
              submitIcon={<UserPlus className="w-4 h-4" aria-hidden="true" />}
              isLoading={gsAddSubmitting}
              loadingLabel="Creating…"
              onCancel={() => setGsAddOpen(false)}
            />
          </form>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════════════════════════
          Bulk Import Ground Staff Modal
      ═══════════════════════════════════════════════════════════ */}
      {bulkOpen && isSysAdmin && (
        <ModalOverlay onClose={() => setBulkOpen(false)} wide>
          <ModalHeader
            icon={
              <Upload className="w-5 h-5" style={{ color: "#2563EB" }} />
            }
            iconBg="rgba(37,99,235,0.15)"
            title="Bulk Import Ground Staff"
            subtitle="Add multiple members at once via form or CSV upload"
            onClose={() => setBulkOpen(false)}
          />

          {/* Mode tabs */}
          <div
            className="flex gap-1 p-1 mx-6 mt-5 rounded-[10px] w-fit"
            style={{
              background: "#0d0d0d",
              border: "1px solid var(--secondary)",
            }}
          >
            {(["manual", "csv"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setBulkMode(mode)}
                className="h-8 px-4 rounded-[7px] transition-all"
                style={{
                  background:
                    bulkMode === mode ? "var(--card)" : "transparent",
                  color:
                    bulkMode === mode ? "#fff" : "var(--muted-foreground)",
                  fontSize: "13px",
                  fontWeight: bulkMode === mode ? 600 : 400,
                  border:
                    bulkMode === mode
                      ? "1px solid var(--secondary)"
                      : "1px solid transparent",
                }}
              >
                {mode === "manual" ? "Manual Entry" : "Import CSV"}
              </button>
            ))}
          </div>

          <form onSubmit={handleBulkCreate} className="p-6 space-y-4">
            {/* ── CSV mode ─────────────────────────────────────── */}
            {bulkMode === "csv" && (
              <div className="space-y-4">
                <div
                  className="p-4 rounded-[12px] space-y-3"
                  style={{
                    background: "#0d0d0d",
                    border: "1px solid var(--secondary)",
                  }}
                >
                  <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                    Upload a <strong className="text-white">.csv</strong> file
                    with columns:{" "}
                    <span style={{ color: "#2563EB", fontFamily: "monospace", fontSize: "12px" }}>
                      first_name, last_name, email, phone_number, password
                    </span>
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => csvInputRef.current?.click()}
                      className="flex items-center gap-2 h-10 px-4 rounded-[10px] text-white hover:opacity-90 transition-opacity"
                      style={{
                        background: "#2563EB",
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      <Upload className="w-4 h-4" aria-hidden="true" />
                      Choose File
                    </button>
                    <button
                      type="button"
                      onClick={downloadCSVTemplate}
                      className="flex items-center gap-2 h-10 px-4 rounded-[10px] hover:bg-secondary transition-colors"
                      style={{
                        border: "1px solid var(--secondary)",
                        fontSize: "13px",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      Download Template
                    </button>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      aria-label="Upload CSV file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCSVFile(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>

                {/* Parse errors */}
                {csvParseErrors.length > 0 && (
                  <div
                    className="p-3 rounded-[10px] space-y-1"
                    style={{
                      background: "rgba(255,69,58,0.08)",
                      border: "1px solid rgba(255,69,58,0.2)",
                    }}
                    role="alert"
                  >
                    <p style={{ fontSize: "13px", color: "#FF453A", fontWeight: 500 }}>
                      {csvParseErrors.length} row{csvParseErrors.length > 1 ? "s" : ""} had issues:
                    </p>
                    {csvParseErrors.slice(0, 5).map((e, i) => (
                      <p key={i} style={{ fontSize: "12px", color: "#FF453A" }}>
                        {e}
                      </p>
                    ))}
                    {csvParseErrors.length > 5 && (
                      <p style={{ fontSize: "12px", color: "#FF453A" }}>
                        …and {csvParseErrors.length - 5} more
                      </p>
                    )}
                  </div>
                )}

                {/* Parse success */}
                {csvParsedCount !== null && csvParsedCount > 0 && (
                  <div
                    className="flex items-center gap-2 p-3 rounded-[10px]"
                    style={{
                      background: "rgba(50,215,75,0.08)",
                      border: "1px solid rgba(50,215,75,0.2)",
                    }}
                    role="status"
                  >
                    <CheckCircle2
                      className="w-4 h-4 shrink-0"
                      style={{ color: "#32D74B" }}
                      aria-hidden="true"
                    />
                    <p style={{ fontSize: "13px", color: "#32D74B" }}>
                      {csvParsedCount} member{csvParsedCount > 1 ? "s" : ""}{" "}
                      parsed — switched to Manual Entry to review before
                      submitting.
                    </p>
                  </div>
                )}

                {csvParsedCount === 0 && (
                  <div
                    className="p-3 rounded-[10px]"
                    style={{
                      background: "rgba(255,69,58,0.08)",
                      border: "1px solid rgba(255,69,58,0.2)",
                    }}
                    role="alert"
                  >
                    <p style={{ fontSize: "13px", color: "#FF453A" }}>
                      No valid rows found in the file. Check the format and try again.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Manual entry mode ──────────────────────────── */}
            {bulkMode === "manual" && (
              <>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {bulkMembers.map((member, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-[12px] space-y-3"
                      style={{
                        background: "#0d0d0d",
                        border: "1px solid var(--secondary)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#555",
                            fontWeight: 600,
                            letterSpacing: "0.06em",
                          }}
                        >
                          MEMBER {idx + 1}
                        </span>
                        {bulkMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBulkRow(idx)}
                            className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                            style={{ fontSize: "12px", color: "#FF453A" }}
                            aria-label={`Remove member ${idx + 1}`}
                          >
                            <X className="w-3 h-3" aria-hidden="true" />
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <BulkField
                          id={`bulk_fname_${idx}`}
                          label="First Name *"
                          required
                          value={member.first_name}
                          onChange={(v) =>
                            updateBulkMember(idx, "first_name", v)
                          }
                          placeholder="Jane"
                        />
                        <BulkField
                          id={`bulk_lname_${idx}`}
                          label="Last Name *"
                          required
                          value={member.last_name}
                          onChange={(v) =>
                            updateBulkMember(idx, "last_name", v)
                          }
                          placeholder="Smith"
                        />
                        <div className="col-span-2">
                          <BulkField
                            id={`bulk_email_${idx}`}
                            label="Email *"
                            type="email"
                            required
                            value={member.email}
                            onChange={(v) =>
                              updateBulkMember(idx, "email", v)
                            }
                            placeholder="jane.smith@org.ie"
                          />
                        </div>
                        <BulkField
                          id={`bulk_phone_${idx}`}
                          label="Phone"
                          type="tel"
                          value={member.phone_number}
                          onChange={(v) =>
                            updateBulkMember(idx, "phone_number", v)
                          }
                          placeholder="+353 1 234 5678"
                        />
                        <div>
                          <label
                            htmlFor={`bulk_pwd_${idx}`}
                            className="block mb-1"
                            style={{
                              fontSize: "12px",
                              color: "var(--muted-foreground)",
                              fontWeight: 500,
                            }}
                          >
                            Password *
                          </label>
                          <PasswordInput
                            id={`bulk_pwd_${idx}`}
                            value={member.password}
                            onChange={(v) =>
                              updateBulkMember(idx, "password", v)
                            }
                            show={bulkShowPasswords[idx] ?? false}
                            onToggle={() => toggleBulkPassword(idx)}
                            required
                            inputStyle={{ background: "#151515" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addBulkRow}
                  className="w-full h-10 rounded-[10px] flex items-center justify-center gap-2 transition-colors hover:bg-secondary"
                  style={{
                    border: "1px dashed var(--secondary)",
                    fontSize: "14px",
                    color: "var(--muted-foreground)",
                  }}
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  Add Another Member
                </button>

                <ModalActions
                  submitLabel={`Create ${bulkMembers.filter((m) => m.first_name && m.email).length || bulkMembers.length} Member${bulkMembers.length > 1 ? "s" : ""}`}
                  submitIcon={<UserPlus className="w-4 h-4" aria-hidden="true" />}
                  isLoading={isBulkSubmitting}
                  loadingLabel="Creating…"
                  onCancel={() => setBulkOpen(false)}
                />
              </>
            )}
          </form>
        </ModalOverlay>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  Icon,
}: {
  label: string;
  value: number;
  color: string;
  Icon: React.ElementType;
}) {
  return (
    <div
      className="p-5 rounded-[16px]"
      style={{ background: "var(--card)", border: "1px solid var(--secondary)" }}
    >
      <div className="mb-3">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}25` }}
        >
          <Icon
            className="w-5 h-5"
            style={{ color }}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
      </div>
      <div
        className="text-white"
        style={{ fontSize: "32px", fontWeight: 600, lineHeight: 1 }}
      >
        {value}
      </div>
      <div
        style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: 4 }}
      >
        {label}
      </div>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 h-10 px-4 rounded-[12px] flex-1"
      style={{ background: "var(--card)", border: "1px solid var(--secondary)" }}
    >
      <Search
        className="w-4 h-4 shrink-0"
        style={{ color: "var(--muted-foreground)" }}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent text-white placeholder-[#4a4a52] focus:outline-none w-full"
        style={{ fontSize: "14px" }}
        aria-label={ariaLabel}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search">
          <X className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
        </button>
      )}
    </div>
  );
}

function AvatarCell({
  id,
  name,
  color,
}: {
  id: string;
  name: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, border: `1.5px solid ${color}40` }}
        aria-hidden="true"
      >
        <span className="text-white" style={{ fontSize: "12px", fontWeight: 600 }}>
          {avatarInitials(name)}
        </span>
      </div>
      <div className="min-w-0">
        <div
          className="text-white truncate"
          style={{ fontSize: "14px", fontWeight: 500 }}
        >
          {name}
        </div>
        <div
          className="truncate"
          style={{ fontSize: "11px", color: "#555", fontFamily: "monospace" }}
          title={id}
        >
          {id.slice(0, 8)}…
        </div>
      </div>
    </div>
  );
}

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
        aria-hidden="true"
      />
      <span style={{ fontSize: "13px", color, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function MembersTable<T>({
  rows,
  isLoading,
  columns,
  emptyTitle,
  emptySubtitle,
  renderRow,
}: {
  rows: T[];
  isLoading: boolean;
  columns: string[];
  emptyTitle: string;
  emptySubtitle: string;
  renderRow: (row: T) => React.ReactNode;
}) {
  return (
    <div
      className="rounded-[16px] overflow-hidden"
      style={{ background: "var(--card)", border: "1px solid var(--secondary)" }}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "#2563EB" }}
            aria-label="Loading"
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users
            className="w-10 h-10 mb-3"
            style={{ color: "var(--border)" }}
            aria-hidden="true"
          />
          <p className="text-white" style={{ fontSize: "15px", fontWeight: 500 }}>
            {emptyTitle}
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "var(--muted-foreground)",
              marginTop: 4,
            }}
          >
            {emptySubtitle}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--secondary)" }}>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-left px-5 py-3.5"
                    style={{
                      fontSize: "11px",
                      color: "#555",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                    }}
                    scope="col"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PaginationBar({
  pagination,
  currentPage,
  onPageChange,
  itemLabel,
  filteredCount,
  hasActiveFilter,
}: {
  pagination: PaginationMeta;
  currentPage: number;
  onPageChange: (page: number) => void;
  itemLabel: string;
  filteredCount: number;
  hasActiveFilter: boolean;
}) {
  if (pagination.total_items === 0) return null;

  if (pagination.total_pages <= 1) {
    return (
      <div
        className="px-5 py-4 rounded-[16px]"
        style={{ background: "var(--card)", border: "1px solid var(--secondary)" }}
      >
        <span style={{ fontSize: "13px", color: "#555" }}>
          {filteredCount} of {pagination.total_items} {itemLabel}
          {pagination.total_items !== 1 ? "s" : ""}
          {hasActiveFilter ? " matching filters" : ""}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between px-5 py-4 rounded-[16px]"
      style={{ background: "var(--card)", border: "1px solid var(--secondary)" }}
    >
      <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
        Showing{" "}
        <span className="text-white">
          {(pagination.page - 1) * pagination.page_size + 1}–
          {Math.min(
            pagination.page * pagination.page_size,
            pagination.total_items,
          )}
        </span>{" "}
        of <span className="text-white">{pagination.total_items}</span>{" "}
        {itemLabel}s
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: "1px solid var(--border)" }}
          aria-label="Previous page"
        >
          <ChevronLeft
            className="w-4 h-4"
            style={{ color: "var(--muted-foreground)" }}
          />
        </button>
        {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 ||
              p === pagination.total_pages ||
              Math.abs(p - currentPage) <= 1,
          )
          .reduce<(number | "…")[]>((acc, p, i, arr) => {
            if (i > 0 && (arr[i - 1] as number) + 1 < p) acc.push("…");
            acc.push(p);
            return acc;
          }, [])
          .map((item, i) =>
            item === "…" ? (
              <span
                key={`e-${i}`}
                style={{ color: "#555", fontSize: "13px", padding: "0 4px" }}
              >
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item as number)}
                className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors"
                style={{
                  border: `1px solid ${currentPage === item ? "#2563EB" : "var(--border)"}`,
                  background:
                    currentPage === item
                      ? "rgba(37,99,235,0.12)"
                      : "transparent",
                  fontSize: "13px",
                  fontWeight: currentPage === item ? 600 : 400,
                  color:
                    currentPage === item ? "#2563EB" : "var(--muted-foreground)",
                }}
                aria-label={`Page ${item}`}
                aria-current={currentPage === item ? "page" : undefined}
              >
                {item}
              </button>
            ),
          )}
        <button
          onClick={() =>
            onPageChange(Math.min(pagination.total_pages, currentPage + 1))
          }
          disabled={currentPage === pagination.total_pages}
          className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: "1px solid var(--border)" }}
          aria-label="Next page"
        >
          <ChevronRight
            className="w-4 h-4"
            style={{ color: "var(--muted-foreground)" }}
          />
        </button>
      </div>
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  required,
  inputStyle,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  required?: boolean;
  inputStyle?: React.CSSProperties;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Secure password"
        className={INPUT_CLS + " pr-10"}
        style={{ ...INPUT_STYLE, ...inputStyle }}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? (
          <EyeOff
            className="w-4 h-4"
            style={{ color: "var(--muted-foreground)" }}
          />
        ) : (
          <Eye
            className="w-4 h-4"
            style={{ color: "var(--muted-foreground)" }}
          />
        )}
      </button>
    </div>
  );
}

function BulkField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block mb-1"
        style={{
          fontSize: "12px",
          color: "var(--muted-foreground)",
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={INPUT_CLS}
        style={{ ...INPUT_STYLE, background: "#151515" }}
      />
    </div>
  );
}

function ModalOverlay({
  onClose,
  children,
  wide = false,
}: {
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full rounded-[20px] max-h-[92vh] overflow-y-auto ${wide ? "max-w-3xl" : "max-w-xl"}`}
        style={{ background: "var(--card)", border: "1px solid var(--secondary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  icon,
  iconBg,
  title,
  subtitle,
  onClose,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-6"
      style={{ borderBottom: "1px solid var(--secondary)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div>
          <h2
            className="text-white"
            style={{ fontSize: "18px", fontWeight: 600 }}
          >
            {title}
          </h2>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            {subtitle}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-[10px] flex items-center justify-center hover:bg-secondary transition-colors"
        aria-label="Close modal"
      >
        <X className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
      </button>
    </div>
  );
}

function FormField({
  id,
  label,
  className = "",
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block mb-1.5"
        style={{
          fontSize: "13px",
          color: "var(--muted-foreground)",
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ModalActions({
  submitLabel,
  submitIcon,
  isLoading,
  loadingLabel,
  onCancel,
}: {
  submitLabel: string;
  submitIcon: React.ReactNode;
  isLoading: boolean;
  loadingLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="submit"
        disabled={isLoading}
        className="flex-1 h-10 rounded-[10px] text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: "#2563EB", fontSize: "14px", fontWeight: 600 }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {loadingLabel}
          </>
        ) : (
          <>
            {submitIcon}
            {submitLabel}
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-10 px-5 rounded-[10px] hover:bg-secondary transition-colors"
        style={{
          border: "1px solid var(--secondary)",
          fontSize: "14px",
          color: "var(--muted-foreground)",
        }}
      >
        Cancel
      </button>
    </div>
  );
}
