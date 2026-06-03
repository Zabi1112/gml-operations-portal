const prisma = require("../utils/prisma");

const createLoan = async (req, res) => {
  try {
    const {
      branchId,
      lenderPartnerId,
      lenderName,
      borrowerPartnerId,
      borrowerName,
      amount,
      note,
      loanDate
    } = req.body;

    if (!branchId || !lenderPartnerId || !borrowerPartnerId || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (Number(lenderPartnerId) === Number(borrowerPartnerId)) {
      return res.status(400).json({ message: "Lender and borrower cannot be the same partner" });
    }

    const loan = await prisma.partnerLoan.create({
      data: {
        branchId: Number(branchId),
        lenderPartnerId: Number(lenderPartnerId),
        lenderName,
        borrowerPartnerId: Number(borrowerPartnerId),
        borrowerName,
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
  getLoans,
  deleteLoan,
  addRepayment,
  deleteRepayment
};