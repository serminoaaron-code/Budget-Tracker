const { useState, useEffect, useMemo, useRef } = React;

// Import Firebase ES Modules via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-yU1YT45okpa8UoLvGnfSvZNOQ42Rntg",
  authDomain: "budget-tracker-c96eb.firebaseapp.com",
  projectId: "budget-tracker-c96eb",
  storageBucket: "budget-tracker-c96eb.firebasestorage.app",
  messagingSenderId: "476510198306",
  appId: "1:476510198306:web:9cbe6eda5718a7ca5fc87b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initial Data Structures
const initialLoans = [
  { id: 'l1', name: 'Mariloan', monthlyPayment: 1918.16, remainingBalance: 11508.96, status: 'Active', notes: 'Personal Loan' },
  { id: 'l2', name: 'SB Loan', monthlyPayment: 6352.66, remainingBalance: 38115.96, status: 'Active', notes: 'Salary Deduction' },
  { id: 'l3', name: 'MB loan', monthlyPayment: 2323.34, remainingBalance: 13940.04, status: 'Active', notes: '' },
  { id: 'l4', name: 'RCBC loan', monthlyPayment: 1091.99, remainingBalance: 6551.94, status: 'Active', notes: '' },
  { id: 'l5', name: 'Leanne', monthlyPayment: 2426.99, remainingBalance: 14561.94, status: 'Active', notes: 'Private Loan' }
];

const initialBanks = [
  { id: 'b1', bankName: 'SeaBank', balance: 15000.00, accountType: 'Digital Bank' },
  { id: 'b2', bankName: 'Maya Bank', balance: 8500.00, accountType: 'Digital Bank' },
  { id: 'b3', bankName: 'GoTyme', balance: 12000.00, accountType: 'Digital Bank' },
  { id: 'b4', bankName: 'BDO', balance: 25000.00, accountType: 'Traditional Bank' }
];

const initialCreditCards = [
  { id: 'c1', cardName: 'BDO Visa Gold', creditLimit: 50000, statementBalance: 12500, cutoffDate: '15th', dueDate: '5th' },
  { id: 'c2', cardName: 'RCBC Flex Mastercard', creditLimit: 30000, statementBalance: 4200, cutoffDate: '20th', dueDate: '10th' }
];

const initialBudgetItems = [
  { id: '1', task: 'Mariloan Payment', category: 'loan', section: 'loan', price: 1918.16, quantity: 1, status: 'Pending', loanId: 'l1' },
  { id: '2', task: 'Fun Money', category: 'Expenses', section: 'expenses', price: 1500.00, quantity: 1, status: 'Paid', loanId: '' },
  { id: '3', task: 'Necessities', category: 'Expenses', section: 'expenses', price: 1000.00, quantity: 1, status: 'Paid', loanId: '' },
  { id: '4', task: 'Transpo', category: 'Expenses', section: 'expenses', price: 1300.00, quantity: 1, status: 'Paid', loanId: '' }
];

function App() {
  const [user, setUser] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Active Tab: 'dashboard' | 'loans' | 'savings' | 'cards'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Half-Month Period Management
  const [currentPeriod, setCurrentPeriod] = useState('March 2026 - 1st Half');
  const [salaryMoney, setSalaryMoney] = useState(18000);

  // Core Collections
  const [budgetItems, setBudgetItems] = useState(initialBudgetItems);
  const [loansList, setLoansList] = useState(initialLoans);
  const [banksList, setBanksList] = useState(initialBanks);
  const [cardsList, setCardsList] = useState(initialCreditCards);
  const [customSections, setCustomSections] = useState([]);

  // UI States
  const [loanFilter, setLoanFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('budgetItem'); // 'budgetItem' | 'loan' | 'bank' | 'card'
  const [editingItem, setEditingItem] = useState(null);

  // Forms
  const [budgetForm, setBudgetForm] = useState({ task: '', category: 'Expenses', section: 'expenses', price: '', quantity: 1, status: 'Pending', loanId: '' });
  const [loanForm, setLoanForm] = useState({ name: '', monthlyPayment: '', remainingBalance: '', status: 'Active', notes: '' });
  const [bankForm, setBankForm] = useState({ bankName: '', balance: '', accountType: 'Digital Bank' });
  const [cardForm, setCardForm] = useState({ cardName: '', creditLimit: '', statementBalance: '', cutoffDate: '', dueDate: '' });

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Sync state to Firestore safely
  const syncToFirestore = async (newBudget, newLoans, newBanks, newCards, newSalary, newSections) => {
    if (!user || isDemoMode) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        budgetItems: newBudget !== undefined ? newBudget : budgetItems,
        loansList: newLoans !== undefined ? newLoans : loansList,
        banksList: newBanks !== undefined ? newBanks : banksList,
        cardsList: newCards !== undefined ? newCards : cardsList,
        salaryMoney: newSalary !== undefined ? newSalary : salaryMoney,
        customSections: newSections !== undefined ? newSections : customSections,
        currentPeriod: currentPeriod
      }, { merge: true });
    } catch (e) {
      console.error("Firestore Sync Error:", e);
    }
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Snapshot
  useEffect(() => {
    if (!user || isDemoMode) return;
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.budgetItems) setBudgetItems(data.budgetItems);
        if (data.loansList) setLoansList(data.loansList);
        if (data.banksList) setBanksList(data.banksList);
        if (data.cardsList) setCardsList(data.cardsList);
        if (data.salaryMoney !== undefined) setSalaryMoney(data.salaryMoney);
        if (data.customSections) setCustomSections(data.customSections);
        if (data.currentPeriod) setCurrentPeriod(data.currentPeriod);
      } else {
        setDoc(userDocRef, {
          budgetItems: initialBudgetItems,
          loansList: initialLoans,
          banksList: initialBanks,
          cardsList: initialCreditCards,
          salaryMoney: 18000,
          customSections: [],
          currentPeriod: 'March 2026 - 1st Half'
        });
      }
    });

    return () => unsubscribe();
  }, [user, isDemoMode]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  // Calculations
  const totalPaidExpenses = useMemo(() => {
    return budgetItems.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.price * i.quantity), 0);
  }, [budgetItems]);

  const totalPendingExpenses = useMemo(() => {
    return budgetItems.filter(i => i.status === 'Pending').reduce((s, i) => s + (i.price * i.quantity), 0);
  }, [budgetItems]);

  const netSpendableMoney = salaryMoney - (totalPaidExpenses + totalPendingExpenses);
  const totalBankSavings = useMemo(() => banksList.reduce((s, b) => s + (parseFloat(b.balance) || 0), 0), [banksList]);
  const totalCreditDebt = useMemo(() => cardsList.reduce((s, c) => s + (parseFloat(c.statementBalance) || 0), 0), [cardsList]);

  // Handle Save Modal
  const handleSaveModal = (e) => {
    e.preventDefault();
    if (modalType === 'budgetItem') {
      const priceNum = parseFloat(budgetForm.price) || 0;
      const qtyNum = parseFloat(budgetForm.quantity) || 1;
      let updated;
      if (editingItem) {
        updated = budgetItems.map(i => i.id === editingItem.id ? { ...budgetForm, price: priceNum, quantity: qtyNum, id: i.id } : i);
      } else {
        updated = [...budgetItems, { ...budgetForm, price: priceNum, quantity: qtyNum, id: Date.now().toString() }];
      }
      setBudgetItems(updated);
      syncToFirestore(updated, loansList, banksList, cardsList, salaryMoney, customSections);
    } else if (modalType === 'loan') {
      const paymentNum = parseFloat(loanForm.monthlyPayment) || 0;
      const remainingNum = parseFloat(loanForm.remainingBalance) || 0;
      let updated;
      if (editingItem) {
        updated = loansList.map(l => l.id === editingItem.id ? { ...loanForm, monthlyPayment: paymentNum, remainingBalance: remainingNum, id: l.id } : l);
      } else {
        updated = [...loansList, { ...loanForm, monthlyPayment: paymentNum, remainingBalance: remainingNum, id: Date.now().toString() }];
      }
      setLoansList(updated);
      syncToFirestore(budgetItems, updated, banksList, cardsList, salaryMoney, customSections);
    } else if (modalType === 'bank') {
      const balNum = parseFloat(bankForm.balance) || 0;
      let updated;
      if (editingItem) {
        updated = banksList.map(b => b.id === editingItem.id ? { ...bankForm, balance: balNum, id: b.id } : b);
      } else {
        updated = [...banksList, { ...bankForm, balance: balNum, id: Date.now().toString() }];
      }
      setBanksList(updated);
      syncToFirestore(budgetItems, loansList, updated, cardsList, salaryMoney, customSections);
    } else if (modalType === 'card') {
      const limitNum = parseFloat(cardForm.creditLimit) || 0;
      const balNum = parseFloat(cardForm.statementBalance) || 0;
      let updated;
      if (editingItem) {
        updated = cardsList.map(c => c.id === editingItem.id ? { ...cardForm, creditLimit: limitNum, statementBalance: balNum, id: c.id } : c);
      } else {
        updated = [...cardsList, { ...cardForm, creditLimit: limitNum, statementBalance: balNum, id: Date.now().toString() }];
      }
      setCardsList(updated);
      syncToFirestore(budgetItems, loansList, banksList, updated, salaryMoney, customSections);
    }
    setShowModal(false);
  };

  // Close Cycle & Update Loans
  const handleArchiveAndNextCycle = () => {
    if (!confirm(`Are you sure you want to finalize "${currentPeriod}"? Paid loan payments will be deducted from total remaining loans.`)) return;

    // Deduct paid loan amounts from remaining loan balances
    const updatedLoans = loansList.map(loan => {
      const paidLoanItems = budgetItems.filter(item => item.loanId === loan.id && item.status === 'Paid');
      const totalPaidThisCycle = paidLoanItems.reduce((s, i) => s + (i.price * i.quantity), 0);
      const newBalance = Math.max(0, loan.remainingBalance - totalPaidThisCycle);
      return {
        ...loan,
        remainingBalance: newBalance,
        status: newBalance === 0 ? 'Fully Paid' : loan.status
      };
    });

    // Reset pending expenses for new half month
    const resetBudget = budgetItems.map(item => ({ ...item, status: 'Pending' }));
    
    // Toggle period
    const nextPeriod = currentPeriod.includes('1st Half') ? currentPeriod.replace('1st Half', '2nd Half') : 'Next Cycle';

    setLoansList(updatedLoans);
    setBudgetItems(resetBudget);
    setCurrentPeriod(nextPeriod);
    syncToFirestore(resetBudget, updatedLoans, banksList, cardsList, salaryMoney, customSections);
  };

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400 font-bold">Loading Financial Manager...</div>;

  if (!user && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-cyan-400">Financial Hub</h1>
            <p className="text-xs text-slate-400 mt-1">Sign in to manage budget, loans & savings</p>
          </div>
          {authError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500" />
            </div>
            <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition">{authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
          </form>
          <div className="text-center text-xs text-slate-400 space-y-3">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-cyan-400 underline font-semibold">{authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}</button>
            <br />
            <button onClick={() => setIsDemoMode(true)} className="text-slate-500 hover:text-slate-300 underline">Preview Demo Mode</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">Budget & Financial Tracker</h1>
            <p className="text-xs text-slate-400">{isDemoMode ? 'Demo Mode' : `User: ${user?.email}`}</p>
          </div>
          <button onClick={() => { signOut(auth); setIsDemoMode(false); }} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs px-3 py-1.5 rounded-xl transition">Sign Out</button>
        </header>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'dashboard' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}>📊 Half-Month Dashboard</button>
          <button onClick={() => setActiveTab('loans')} className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'loans' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}>🏦 Loans Payoff Tracker</button>
          <button onClick={() => setActiveTab('savings')} className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'savings' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}>💰 Banks & Savings</button>
          <button onClick={() => setActiveTab('cards')} className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'cards' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}>💳 Credit Cards</button>
        </div>

        {/* TAB 1: HALF-MONTH DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Current Pay Period</span>
                <input type="text" value={currentPeriod} onChange={e => { setCurrentPeriod(e.target.value); syncToFirestore(budgetItems, loansList, banksList, cardsList, salaryMoney, customSections); }} className="block bg-slate-950 border border-slate-800 text-sm font-bold text-cyan-400 px-3 py-1 rounded-xl mt-1 font-mono" />
              </div>
              <button onClick={handleArchiveAndNextCycle} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold transition">
                Finish Half-Month & Update Monthly Loans 🔄
              </button>
            </div>

            {netSpendableMoney < 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs">
                ⚠️ <strong>Warning: Insufficient Funds!</strong> Your pending bills exceed your salary by ₱{Math.abs(netSpendableMoney).toFixed(2)}. Check your savings or bank balances.
              </div>
            )}

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase font-semibold">Half-Month Salary</span>
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-slate-400 text-base">₱</span>
                  <input type="number" value={salaryMoney} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setSalaryMoney(val); syncToFirestore(budgetItems, loansList, banksList, cardsList, val, customSections); }} className="bg-slate-950 border border-slate-800 text-lg font-bold text-slate-100 rounded-xl px-2 py-0.5 w-full font-mono" />
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase font-semibold">Total Paid</span>
                <p className="text-xl font-bold text-emerald-400 font-mono mt-1">₱{totalPaidExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase font-semibold">Total Pending</span>
                <p className="text-xl font-bold text-amber-400 font-mono mt-1">₱{totalPendingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 uppercase font-semibold">Remaining Spendable</span>
                <p className={`text-xl font-bold font-mono mt-1 ${netSpendableMoney >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>₱{netSpendableMoney.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Expenses & Loans Half-Month Tables */}
            {['loan', 'expenses', ...customSections].map(secKey => {
              const items = budgetItems.filter(i => i.section === secKey);
              const total = items.reduce((s, i) => s + (i.price * i.quantity), 0);

              return (
                <div key={secKey} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 bg-slate-800/50 flex justify-between items-center border-b border-slate-800">
                    <h2 className="font-bold capitalize">{secKey.replace(/_/g, ' ')} Items (This Cycle)</h2>
                    <button onClick={() => { setModalType('budgetItem'); setEditingItem(null); setBudgetForm({ task: '', category: secKey === 'loan' ? 'loan' : 'Expenses', section: secKey, price: '', quantity: 1, status: 'Pending', loanId: '' }); setShowModal(true); }} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3 py-1.5 rounded-lg transition">+ Add Row</button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-3">Task / Obligation</th>
                          <th className="p-3">Linked Tracker Loan</th>
                          <th className="p-3 text-right">Amount (₱)</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {items.length === 0 ? (
                          <tr><td colSpan="5" className="p-4 text-center text-slate-500 italic text-xs">No items set for this period.</td></tr>
                        ) : (
                          items.map(item => {
                            const linkedLoan = loansList.find(l => l.id === item.loanId);
                            return (
                              <tr key={item.id} className="hover:bg-slate-800/30 transition">
                                <td className="p-3 font-medium text-slate-200">{item.task}</td>
                                <td className="p-3 text-xs text-slate-400">{linkedLoan ? `🔗 ${linkedLoan.name}` : '—'}</td>
                                <td className="p-3 text-right font-mono font-bold">₱{(item.price * item.quantity).toFixed(2)}</td>
                                <td className="p-3 text-center text-xs">
                                  <button onClick={() => {
                                    const updated = budgetItems.map(i => i.id === item.id ? { ...i, status: i.status === 'Paid' ? 'Pending' : 'Paid' } : i);
                                    setBudgetItems(updated);
                                    syncToFirestore(updated, loansList, banksList, cardsList, salaryMoney, customSections);
                                  }} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                    {item.status || 'Pending'}
                                  </button>
                                </td>
                                <td className="p-3 text-right space-x-2">
                                  <button onClick={() => { setModalType('budgetItem'); setEditingItem(item); setBudgetForm(item); setShowModal(true); }} className="text-slate-400 hover:text-cyan-400 text-xs">✏️</button>
                                  <button onClick={() => { const updated = budgetItems.filter(i => i.id !== item.id); setBudgetItems(updated); syncToFirestore(updated, loansList, banksList, cardsList, salaryMoney, customSections); }} className="text-slate-400 hover:text-red-400 text-xs">🗑️</button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                    <div className="p-4 bg-slate-950/80 flex justify-between items-center font-bold border-t border-slate-800">
                      <span className="text-xs uppercase text-slate-400">Subtotal</span>
                      <span className="text-cyan-400 font-mono text-lg">₱{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: LOANS PAYOFF TRACKER */}
        {activeTab === 'loans' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400 font-semibold">Filter Loans:</span>
                <select value={loanFilter} onChange={e => setLoanFilter(e.target.value)} className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 text-slate-200">
                  <option value="All">All Loans</option>
                  <option value="Active">Active Loans</option>
                  <option value="Fully Paid">Fully Paid</option>
                </select>
              </div>
              <button onClick={() => { setModalType('loan'); setEditingItem(null); setLoanForm({ name: '', monthlyPayment: '', remainingBalance: '', status: 'Active', notes: '' }); setShowModal(true); }} className="bg-cyan-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl">+ Add New Loan</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loansList.filter(l => loanFilter === 'All' || l.status === loanFilter).map(loan => {
                const monthsLeft = loan.monthlyPayment > 0 ? Math.ceil(loan.remainingBalance / loan.monthlyPayment) : 0;
                const targetDate = new Date();
                targetDate.setMonth(targetDate.getMonth() + monthsLeft);
                const payoffDate = targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                return (
                  <div key={loan.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 relative shadow-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-100 text-base">{loan.name}</h3>
                        <p className="text-xs text-slate-400">{loan.notes || 'No description'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${loan.status === 'Active' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{loan.status}</span>
                    </div>

                    <div className="space-y-1.5 text-xs pt-2 border-t border-slate-800">
                      <div className="flex justify-between text-slate-400"><span>Monthly Obligation:</span> <strong className="text-slate-200 font-mono">₱{loan.monthlyPayment.toFixed(2)}</strong></div>
                      <div className="flex justify-between text-slate-400"><span>Remaining Debt:</span> <strong className="text-rose-400 font-mono font-bold">₱{loan.remainingBalance.toFixed(2)}</strong></div>
                      <div className="flex justify-between text-slate-400"><span>Duration Left:</span> <strong className="text-cyan-400 font-bold">{monthsLeft} Months</strong></div>
                      <div className="flex justify-between text-slate-400"><span>Estimated Payoff:</span> <strong className="text-emerald-400 font-bold">{payoffDate}</strong></div>
                    </div>

                    <div className="pt-2 flex space-x-2">
                      <button onClick={() => { setModalType('loan'); setEditingItem(loan); setLoanForm(loan); setShowModal(true); }} className="w-full bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs py-1.5 rounded-xl border border-slate-800 transition">Edit Terms ✏️</button>
                      <button onClick={() => { const updated = loansList.filter(l => l.id !== loan.id); setLoansList(updated); syncToFirestore(budgetItems, updated, banksList, cardsList, salaryMoney, customSections); }} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-xl text-xs border border-red-500/20">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: BANKS & SAVINGS */}
        {activeTab === 'savings' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Total Bank Holdings</span>
                <p className="text-2xl font-extrabold text-cyan-400 font-mono">₱{totalBankSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <button onClick={() => { setModalType('bank'); setEditingItem(null); setBankForm({ bankName: '', balance: '', accountType: 'Digital Bank' }); setShowModal(true); }} className="bg-cyan-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl">+ Add Bank Account</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banksList.map(bank => (
                <div key={bank.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex justify-between items-center shadow-lg">
                  <div>
                    <h3 className="font-bold text-slate-100">{bank.bankName}</h3>
                    <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md mt-1 inline-block">{bank.accountType}</span>
                    <p className="text-xl font-bold font-mono text-emerald-400 mt-2">₱{parseFloat(bank.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="space-x-2">
                    <button onClick={() => { setModalType('bank'); setEditingItem(bank); setBankForm(bank); setShowModal(true); }} className="text-slate-400 hover:text-cyan-400 text-xs">✏️</button>
                    <button onClick={() => { const updated = banksList.filter(b => b.id !== bank.id); setBanksList(updated); syncToFirestore(budgetItems, loansList, updated, cardsList, salaryMoney, customSections); }} className="text-slate-400 hover:text-red-400 text-xs">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CREDIT CARDS */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Total Credit Card Statement Debt</span>
                <p className="text-2xl font-extrabold text-rose-400 font-mono">₱{totalCreditDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <button onClick={() => { setModalType('card'); setEditingItem(null); setCardForm({ cardName: '', creditLimit: '', statementBalance: '', cutoffDate: '', dueDate: '' }); setShowModal(true); }} className="bg-cyan-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl">+ Add Credit Card</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cardsList.map(card => (
                <div key={card.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-100">{card.cardName}</h3>
                    <div className="space-x-2">
                      <button onClick={() => { setModalType('card'); setEditingItem(card); setCardForm(card); setShowModal(true); }} className="text-slate-400 hover:text-cyan-400 text-xs">✏️</button>
                      <button onClick={() => { const updated = cardsList.filter(c => c.id !== card.id); setCardsList(updated); syncToFirestore(budgetItems, loansList, banksList, updated, salaryMoney, customSections); }} className="text-slate-400 hover:text-red-400 text-xs">🗑️</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div>Limit: <strong className="text-slate-200 font-mono">₱{parseFloat(card.creditLimit).toFixed(2)}</strong></div>
                    <div>Statement Balance: <strong className="text-rose-400 font-mono">₱{parseFloat(card.statementBalance).toFixed(2)}</strong></div>
                    <div>Cutoff: <strong className="text-slate-200">{card.cutoffDate}</strong></div>
                    <div>Due Date: <strong className="text-amber-400">{card.dueDate}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* DYNAMIC MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold capitalize">{editingItem ? `Edit ${modalType}` : `Add New ${modalType}`}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3">
              {modalType === 'budgetItem' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Task / Description</label>
                    <input type="text" required value={budgetForm.task} onChange={e => setBudgetForm({ ...budgetForm, task: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Link to Payoff Tracker Loan (Optional)</label>
                    <select value={budgetForm.loanId} onChange={e => setBudgetForm({ ...budgetForm, loanId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm">
                      <option value="">None (General Expense)</option>
                      {loansList.map(loan => <option key={loan.id} value={loan.id}>{loan.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Amount (₱)</label>
                    <input type="number" step="0.01" required value={budgetForm.price} onChange={e => setBudgetForm({ ...budgetForm, price: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono" />
                  </div>
                </>
              )}

              {modalType === 'loan' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Loan Name</label>
                    <input type="text" required value={loanForm.name} onChange={e => setLoanForm({ ...loanForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Monthly Payment (₱)</label>
                    <input type="number" step="0.01" required value={loanForm.monthlyPayment} onChange={e => setLoanForm({ ...loanForm, monthlyPayment: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Total Remaining Debt (₱)</label>
                    <input type="number" step="0.01" required value={loanForm.remainingBalance} onChange={e => setLoanForm({ ...loanForm, remainingBalance: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Status</label>
                    <select value={loanForm.status} onChange={e => setLoanForm({ ...loanForm, status: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm">
                      <option value="Active">Active</option>
                      <option value="Fully Paid">Fully Paid</option>
                    </select>
                  </div>
                </>
              )}

              {modalType === 'bank' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bank Name</label>
                    <input type="text" required value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Balance (₱)</label>
                    <input type="number" step="0.01" required value={bankForm.balance} onChange={e => setBankForm({ ...bankForm, balance: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono" />
                  </div>
                </>
              )}

              {modalType === 'card' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Card Name</label>
                    <input type="text" required value={cardForm.cardName} onChange={e => setCardForm({ ...cardForm, cardName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Credit Limit (₱)</label>
                      <input type="number" required value={cardForm.creditLimit} onChange={e => setCardForm({ ...cardForm, creditLimit: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Statement Balance (₱)</label>
                      <input type="number" required value={cardForm.statementBalance} onChange={e => setCardForm({ ...cardForm, statementBalance: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono" />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
