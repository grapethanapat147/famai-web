import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/auth/money";
import { canApproveExpense, canManageExpense, type ExpenseRow } from "@/lib/expense/expenses";
import { ExpenseView, type ExpenseCategoryOption } from "@/components/expense/ExpenseView";
import { approveExpense, recordExpense, revokeExpenseApproval } from "./actions";

export const metadata = { title: "ค่าใช้จ่าย — Famai Motor Group" };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function ExpensePage() {
  const supabase = await createServerSupabase();
  const user = await getCurrentUser();

  const [expensesRes, categoriesRes, usersRes] = await Promise.all([
    supabase
      .from("expense")
      .select("id, category_id, spent_at, amount, vendor, tax_invoice_no, has_receipt, note, created_by, approved_by, approved_at")
      .order("spent_at", { ascending: false }),
    supabase.from("expense_category").select("id, name").order("name"),
    supabase.from("app_user").select("id, full_name"),
  ]);

  const categoryName = new Map((categoriesRes.data ?? []).map((c) => [c.id, c.name]));
  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));

  const expenses: ExpenseRow[] = (expensesRes.data ?? []).map((e) => ({
    id: e.id,
    categoryId: e.category_id,
    categoryName: categoryName.get(e.category_id) ?? "—",
    vendor: e.vendor ?? "",
    amount: Number(e.amount),
    spentAt: e.spent_at,
    hasReceipt: e.has_receipt,
    taxInvoiceNo: e.tax_invoice_no,
    note: e.note,
    createdByName: (e.created_by && userName.get(e.created_by)) || null,
    approvedAt: e.approved_at,
    approvedByName: (e.approved_by && userName.get(e.approved_by)) || null,
  }));

  const categories: ExpenseCategoryOption[] = (categoriesRes.data ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <ExpenseView
      expenses={expenses}
      categories={categories}
      canManage={canManageExpense(user?.roleCodes ?? [])}
      canSeeMoney={await canSeeMoney()}
      today={todayISO()}
      action={recordExpense}
      canApprove={user ? canApproveExpense(user.perms) : false}
      approveAction={approveExpense}
      revokeAction={revokeExpenseApproval}
    />
  );
}
