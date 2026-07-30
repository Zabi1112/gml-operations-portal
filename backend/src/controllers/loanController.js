const prisma = require("../utils/prisma");

// Resolves a lender/borrower side into { partnerId, name, isAccounts }.
// A side is either a specific BranchPartner (partnerId set) or the branch's Accounts (isAccounts: true).
const resolveLoanParty = (partnerId, isAccounts, name) => {
  if (isAccounts) {
    return { partnerId: null, name: "Accounts", isAccounts: true };
  }
  if (!partnerId) return null;
  return { partnerId: Number(partnerId), name, isAccounts: false };
};

const samePartyCheck = (lender, borrower) => {
  if (lender.isAccounts && borrower.isAccounts) return true;
  if (!lender.isAccounts && !borrower.isAccounts && lender.partnerId === borrower.partnerId) {
    return true;
  }
  return false;
};

const createLoan = async (req, res) => {
  try {
    const {
      branchId,
      lenderPartnerId,
      lenderIsAccounts,
      lenderName,
      borrowerPartnerId,
      borrowerIsAccounts,
      borrowerName,
      amount,
      note,
      loanDate
    } = req.body;

    if (!branchId || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const lender = resolveLoanParty(lenderPartnerId, lenderIsAccounts, lenderName);
    const borrower = resolveLoanParty(borrowerPartnerId, borrowerIsAccounts, borrowerName);

    if (!lender || !borrower) {
      return res.status(400).json({ message: "Please select both lender and borrower" });
    }

    if (samePartyCheck(lender, borrower)) {
      return res.status(400).json({ message: "Lender and borrower cannot be the same" });
    }

    const loan = await prisma.partnerLoan.create({
      data: {
        branchId: Number(branchId),
        lenderPartnerId: lender.partnerId,
        lenderName: lender.name,
        lenderIsAccounts: lender.isAccounts,
        borrowerPartnerId: borrower.partnerId,
        borrowerName: borrower.name,
        borrowerIsAccounts: borrower.isAccounts,
        amount: Number(amount),
        note: note || null,
        loanDate: loanDate ? new Date(loanDate) : new Date()
      },
      include: { repayments: true }
    });

    res.status(201).json({ message: "Loan created successfully", loan });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      lenderPartnerId,
      lenderIsAccounts,
      lenderName,
      borrowerPartnerId,
      borrowerIsAccounts,
      borrowerName,
      amount,
      note,
      loanDate
    } = req.body;

    const existing = await prisma.partnerLoan.findUnique({
      where: { id: Number(id) },
      include: { repayments: true }
    });

    if (!existing) return res.status(404).json({ message: "Loan not found" });

    const lender = resolveLoanParty(
      lenderPartnerId ?? existing.lenderPartnerId,
      lenderIsAccounts ?? existing.lenderIsAccounts,
      lenderName ?? existing.lenderName
    );
    const borrower = resolveLoanParty(
      borrowerPartnerId ?? existing.borrowerPartnerId,
      borrowerIsAccounts ?? existing.borrowerIsAccounts,
      borrowerName ?? existing.borrowerName
    );

    if (!lender || !borrower) {
      return res.status(400).json({ message: "Please select both lender and borrower" });
    }

    if (samePartyCheck(lender, borrower)) {
      return res.status(400).json({ message: "Lender and borrower cannot be the same" });
    }

    const newAmount = Number(amount ?? existing.amount);
    const totalRepaid = existing.repayments.reduce((sum, r) => sum + Number(r.amount), 0);

    if (newAmount < totalRepaid) {
      return res.status(400).json({
        message: `Loan amount cannot be less than the amount already repaid (${totalRepaid})`
      });
    }

    const loan = await prisma.partnerLoan.update({
      where: { id: Number(id) },
      data: {
        lenderPartnerId: lender.partnerId,
        lenderName: lender.name,
        lenderIsAccounts: lender.isAccounts,
        borrowerPartnerId: borrower.partnerId,
        borrowerName: borrower.name,
        borrowerIsAccounts: borrower.isAccounts,
        amount: newAmount,
        note: note ?? existing.note,
        loanDate: loanDate ? new Date(loanDate) : existing.loanDate
      },
      include: { repayments: true }
    });

    res.json({ message: "Loan updated successfully", loan });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const getLoans = async (req, res) => {
  try {
    const { branchId } = req.query;

    const where = {};
    if (branchId) where.branchId = Number(branchId);

    const loans = await prisma.partnerLoan.findMany({
      where,
      include: { repayments: true },
      orderBy: { createdAt: "desc" }
    });

    // Calculate outstanding balance for each loan
    const loansWithBalance = loans.map((loan) => {
      const totalRepaid = loan.repayments.reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );
      return {
        ...loan,
        totalRepaid,
        outstanding: Number(loan.amount) - totalRepaid
      };
    });

    res.json(loansWithBalance);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.partnerLoanRepayment.deleteMany({
      where: { loanId: Number(id) }
    });

    await prisma.partnerLoan.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Loan deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const addRepayment = async (req, res) => {
  try {
    const { loanId, amount, note, paidDate } = req.body;

    if (!loanId || !amount) {
      return res.status(400).json({ message: "loanId and amount are required" });
    }

    const loan = await prisma.partnerLoan.findUnique({
      where: { id: Number(loanId) },
      include: { repayments: true }
    });

    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const totalRepaid = loan.repayments.reduce(
      (sum, r) => sum + Number(r.amount),
      0
    );
    const outstanding = Number(loan.amount) - totalRepaid;

    if (Number(amount) > outstanding) {
      return res.status(400).json({
        message: `Repayment amount exceeds outstanding balance of ${outstanding}`
      });
    }

    const repayment = await prisma.partnerLoanRepayment.create({
      data: {
        loanId: Number(loanId),
        amount: Number(amount),
        note: note || null,
        paidDate: paidDate ? new Date(paidDate) : new Date()
      }
    });

    res.status(201).json({ message: "Repayment recorded successfully", repayment });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const updateRepayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, note, paidDate } = req.body;

    const existing = await prisma.partnerLoanRepayment.findUnique({
      where: { id: Number(id) }
    });

    if (!existing) return res.status(404).json({ message: "Repayment not found" });

    const loan = await prisma.partnerLoan.findUnique({
      where: { id: existing.loanId },
      include: { repayments: true }
    });

    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const newAmount = Number(amount ?? existing.amount);

    const otherRepaid = loan.repayments
      .filter((r) => r.id !== existing.id)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    if (otherRepaid + newAmount > Number(loan.amount) + 1) {
      return res.status(400).json({
        message: `Repayment amount exceeds outstanding balance of ${Number(loan.amount) - otherRepaid}`
      });
    }

    const repayment = await prisma.partnerLoanRepayment.update({
      where: { id: Number(id) },
      data: {
        amount: newAmount,
        note: note ?? existing.note,
        paidDate: paidDate ? new Date(paidDate) : existing.paidDate
      }
    });

    res.json({ message: "Repayment updated successfully", repayment });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const deleteRepayment = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.partnerLoanRepayment.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Repayment deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = {
  createLoan,
  updateLoan,
  getLoans,
  deleteLoan,
  addRepayment,
  updateRepayment,
  deleteRepayment
};