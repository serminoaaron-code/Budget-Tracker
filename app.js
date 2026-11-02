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
  { id: '1', task: 'Kuya Joker', category: 'loan', section: 'loan', price: 8000.00, quantity: 1, status: 'Pending', bankName: 'SeaBank', loanId: 'l1' },
  { id: '2', task: 'Necessities', category: 'Expenses', section: 'expenses', price: 1500.00, quantity: 1, status: 'Paid', bankName: 'GoTyme', loanId: '' }
];

function App() {
  const [user, setUser] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'loans' | 'savings' | 'cards'
  const [currentPeriod, setCurrentPeriod] = useState('March 2026 - 1st Half');
  const [salaryMoney, setSalaryMoney] = useState(19000);

  const [budgetItems, setBudgetItems] = useState(initialBudgetItems);
  const [loansList, setLoansList] = useState(initialLoans);
  const [banksList, setBanksList] = useState(initialBanks);
  const [cardsList, setCardsList] = useState(initialCreditCards);
  const [customSections, setCustomSections] = useState([]);

  const [loanFilter, setLoanFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('budgetItem'); // 'budgetItem' | 'loan' | 'bank' | 'card'
  const [editingItem, setEditingItem] = useState(null);

  const [budgetForm, setBudgetForm] = useState({ task: '', category: 'Expenses', section: 'expenses', price: '', quantity: 1, status: 'Pending', bankName: 'SeaBank', loanId: '' });
  const [loanForm, setLoanForm] = useState({ name: '', monthlyPayment: '', remainingBalance: '', status: 'Active', notes: '' });
  const [bankForm, setBankForm] = useState({ bankName: '', balance: '', accountType: 'Digital Bank' });
  const [cardForm, setCardForm] = useState({ cardName: '', creditLimit: '', statementBalance: '', cutoffDate: '', dueDate: '' });

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
          salaryMoney: 19000,
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

  // Totals
  const totalPaid = useMemo(() => budgetItems.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.price * i.quantity), 0), [budgetItems]);
  const totalPending = useMemo(() => budgetItems.filter(i => i.status === 'Pending').reduce((s, i) => s + (i.price * i.quantity), 0), [budgetItems]);
  const netSafeSpendable = salaryMoney - (totalPaid + totalPending);
  const totalUsed = totalPaid + totalPending;
  const usedPercentage = salaryMoney > 0 ? ((totalUsed / salaryMoney) * 100).toFixed(1) : 0;
  
  const totalBankSavings = useMemo(() => banksList.reduce((s, b) => s + (parseFloat(b.balance) || 0), 0), [banksList]);
  const totalCreditDebt = useMemo(() => cardsList.reduce((s, c) => s + (parseFloat(c.statementBalance) || 0), 0), [cardsList]);

  // Finish Cycle & Deduct Paid Loans
  const handleArchiveAndNextCycle = () => {
    if (!confirm(`Are you sure you want to finalize "${currentPeriod}"? Paid loan items will deduct from your Payoff Tracker balance.`)) return;

    const updatedLoans = loansList.map(loan => {
      const paidItemsForLoan = budgetItems.filter(item => item.loanId === loan.id && item.status === 'Paid');
      const totalDeduction = paidItemsForLoan.reduce((s, i) => s + (i.price * i.quantity), 0);
      const newBal = Math.max(0, loan.remainingBalance - totalDeduction);
      return {
        ...loan,
        remainingBalance: newBal,
        status: newBal === 0 ? 'Fully Paid' : loan.status
      };
    });

    const resetBudget = budgetItems.map(item => ({ ...item, status: 'Pending' }));
    const nextPeriod = currentPeriod.includes('1st Half') ? currentPeriod.replace('1st Half', '2nd Half') : 'Next Cycle';

    setLoansList(updatedLoans);
    setBudgetItems(resetBudget);
    setCurrentPeriod(nextPeriod);
    syncToFirestore(resetBudget, updatedLoans, banksList, cardsList, salaryMoney, customSections);
  };

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

  if (authLoading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-blue-600 font-bold">Loading...</div>;

  if (!user && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-900">Budget Tracker</h1>
            <p className="text-xs text-slate-500 mt-1">Plan • Track • Achieve</p>
          </div>
          {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-semibold uppercase">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 font-semibold uppercase">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
          </form>
          <div className="text-center text-xs text-slate-500 space-y-3">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-blue-600 underline font-semibold">{authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}</button>
            <br />
            <button onClick={() => setIsDemoMode(true)} className="text-slate-400 hover:text-slate-600 underline">Preview Demo Mode</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#edf2f9] flex text-slate-800 font-sans">
      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-[#1b2b65] text-white flex flex-col justify-between p-6 shrink-0 min-h-screen">
        <div className="space-y-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center text-2xl">👛</div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Budget<br />Tracker</h1>
              <p className="text-[10px] text-blue-200">Plan • Track • Achieve</p>
            </div>
          </div>

          <nav className="space-y-2">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition ${activeTab === 'dashboard' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-blue-200 hover:bg-white/5'}`}>
              <span>🏠</span> <span>Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('loans')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition ${activeTab === 'loans' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-blue-200 hover:bg-white/5'}`}>
              <span>🏦</span> <span>Loan Tracker</span>
            </button>
            <button onClick={() => setActiveTab('savings')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition ${activeTab === 'savings' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-blue-200 hover:bg-white/5'}`}>
              <span>💰</span> <span>Banks & Savings</span>
            </button>
            <button onClick={() => setActiveTab('cards')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition ${activeTab === 'cards' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-blue-200 hover:bg-white/5'}`}>
              <span>💳</span> <span>Credit Cards</span>
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <div className="bg-[#243775] p-4 rounded-2xl text-center space-y-2">
            <div className="text-3xl">🌱💰</div>
            <p className="text-xs font-medium text-blue-100 italic">Small steps today, big goals tomorrow!</p>
          </div>
          <button onClick={() => { signOut(auth); setIsDemoMode(false); }} className="w-full flex items-center space-x-2 text-blue-200 hover:text-white text-xs px-2 py-1 transition">
            <span>🚪</span> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        
        {/* Top Bar */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#1b2b65]">Welcome back! 👋</h1>
            <p className="text-xs text-slate-500">Let's keep your budget on track!</p>
          </div>
          <div className="flex items-center space-x-3">
            {activeTab === 'dashboard' && (
              <button onClick={handleArchiveAndNextCycle} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-full transition shadow-sm">
                Finish Period & Update Monthly Loans 🔄
              </button>
            )}
            <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-full shadow-sm">
              <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">👤</div>
              <span className="text-xs font-semibold text-slate-700">{user?.email?.split('@')[0] || 'Aaron'}</span>
            </div>
          </div>
        </div>

        {/* TOP CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center space-x-4 border border-slate-100">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white text-lg">👛</div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Half-Month Salary</span>
              <div className="flex items-center text-lg font-bold text-slate-800">
                <span>₱</span>
                <input type="number" value={salaryMoney} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setSalaryMoney(val); syncToFirestore(budgetItems, loansList, banksList, cardsList, val, customSections); }} className="w-24 bg-transparent border-none font-bold text-slate-800 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center space-x-4 border border-slate-100">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-lg">💸</div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Paid</span>
              <p className="text-lg font-bold text-emerald-600">₱ {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center space-x-4 border border-slate-100">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-white text-lg">🕒</div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Pending</span>
              <p className="text-lg font-bold text-amber-500">₱ {totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center space-x-4 border border-slate-100">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-lg">✓</div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Net Safe Spendable</span>
              <p className={`text-lg font-bold ${netSafeSpendable >= 0 ? 'text-blue-600' : 'text-red-500'}`}>₱ {netSafeSpendable.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* TAB 1: HALF-MONTH DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                  <span>📊</span> <span>Your Budget Overview</span>
                </h3>
                <div className="flex items-center space-x-6 pt-2">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-blue-500" strokeDasharray={`${usedPercentage}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-base font-extrabold text-slate-800">{usedPercentage}%</span>
                      <p className="text-[9px] text-slate-400 uppercase font-semibold">Used</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-[#1b2b65]">₱ {totalUsed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-slate-400">Out of ₱ {salaryMoney.toLocaleString()}</p>
                    <div className="bg-blue-50 text-blue-600 text-[11px] p-2 rounded-xl flex items-center space-x-2">
                      <span>ℹ️</span> <span>You still have <strong>₱{netSafeSpendable.toLocaleString()} left!</strong> ✨</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                    <span>📊</span> <span>Monthly Spending Trend</span>
                  </h3>
                  <input type="text" value={currentPeriod} onChange={e => { setCurrentPeriod(e.target.value); syncToFirestore(budgetItems, loansList, banksList, cardsList, salaryMoney, customSections); }} className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 font-bold" />
                </div>
                <div className="h-32 flex items-end justify-between px-4 pt-6 border-b border-slate-100">
                  <div className="flex flex-col items-center space-y-1"><div className="w-3 h-4 bg-blue-300 rounded-t"></div><span className="text-[10px] text-slate-400">Week 1</span></div>
                  <div className="flex flex-col items-center space-y-1"><div className="w-3 h-16 bg-blue-500 rounded-t"></div><span className="text-[10px] text-slate-400">Week 2</span></div>
                  <div className="flex flex-col items-center space-y-1"><div className="w-3 h-20 bg-blue-600 rounded-t"></div><span className="text-[10px] text-slate-400">Week 3</span></div>
                  <div className="flex flex-col items-center space-y-1"><div className="w-3 h-28 bg-blue-700 rounded-t"></div><span className="text-[10px] text-slate-400">Week 4</span></div>
                </div>
              </div>
            </div>

            {['loan', 'expenses', ...customSections].map(secKey => {
              const items = budgetItems.filter(i => i.section === secKey);
              const total = items.reduce((s, i) => s + (i.price * i.quantity), 0);

              return (
                <div key={secKey} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 flex justify-between items-center border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600 text-lg">{secKey === 'loan' ? '🏛️' : '🛒'}</span>
                      <h2 className="font-bold text-slate-800 capitalize">{secKey.replace(/_/g, ' ')} Section</h2>
                    </div>
                    <button onClick={() => { setModalType('budgetItem'); setEditingItem(null); setBudgetForm({ task: '', category: secKey === 'loan' ? 'loan' : 'Expenses', section: secKey, price: '', quantity: 1, status: 'Pending', bankName: 'SeaBank', loanId: '' }); setShowModal(true); }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-xl transition">
                      + Add Row
                    </button>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1b2b65] text-white uppercase text-[10px]">
                      <tr>
                        <th className="p-3">TASK</th>
                        <th className="p-3">LINKED TRACKER LOAN</th>
                        <th className="p-3">SAVINGS / BANK</th>
                        <th className="p-3 text-right">MONTHLY / PRICE</th>
                        <th className="p-3 text-center">STATUS</th>
                        <th className="p-3 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-6 text-center text-slate-400 italic">
                            <div className="text-2xl mb-1">📋</div>
                            No rows yet. Click + Add Row above.
                          </td>
                        </tr>
                      ) : (
                        items.map(item => {
                          const linkedLoan = loansList.find(l => l.id === item.loanId);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                              <td className="p-3 font-semibold text-slate-700 flex items-center space-x-2">
                                <span>👤</span> <span>{item.task}</span>
                              </td>
                              <td className="p-3 text-slate-500 font-medium">{linkedLoan ? `🔗 ${linkedLoan.name}` : '—'}</td>
                              <td className="p-3">
                                <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-[11px] font-medium flex items-center w-fit space-x-1">
                                  <span>🌊</span> <span>{item.bankName || 'SeaBank'}</span>
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold text-slate-800">₱{(item.price * item.quantity).toFixed(2)}</td>
                              <td className="p-3 text-center">
                                <button onClick={() => {
                                  const updated = budgetItems.map(i => i.id === item.id ? { ...i, status: i.status === 'Paid' ? 'Pending' : 'Paid' } : i);
                                  setBudgetItems(updated);
                                  syncToFirestore(updated, loansList, banksList, cardsList, salaryMoney, customSections);
                                }} className={`px-3 py-1 rounded-full text-[11px] font-semibold ${item.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                  ● {item.status || 'Pending'}
                                </button>
                              </td>
                              <td className="p-3 text-right space-x-2">
                                <button onClick={() => { setModalType('budgetItem'); setEditingItem(item); setBudgetForm(item); setShowModal(true); }} className="text-blue-500 hover:text-blue-700">✏️</button>
                                <button onClick={() => { const updated = budgetItems.filter(i => i.id !== item.id); setBudgetItems(updated); syncToFirestore(updated, loansList, banksList, cardsList, salaryMoney, customSections); }} className="text-red-400 hover:text-red-600">🗑️</button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div className="p-4 bg-blue-50/50 flex justify-between items-center font-bold text-slate-700 border-t border-slate-100">
                    <span className="text-xs uppercase">TOTAL</span>
                    <span className="text-blue-600 font-extrabold text-sm">₱{total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: LOANS PAYOFF TRACKER */}
        {activeTab === 'loans' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div className="flex items-center space-x-3">
                <h2 className="font-bold text-slate-800">🏦 Loans Payoff Tracker</h2>
                <select value={loanFilter} onChange={e => setLoanFilter(e.target.value)} className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold">
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Loans</option>
                  <option value="Fully Paid">Fully Paid</option>
                </select>
              </div>
              <button onClick={() => { setModalType('loan'); setEditingItem(null); setLoanForm({ name: '', monthlyPayment: '', remainingBalance: '', status: 'Active', notes: '' }); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition">+ Add Loan</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loansList.filter(l => loanFilter === 'All' || l.status === loanFilter).map(loan => {
                const monthsLeft = loan.monthlyPayment > 0 ? Math.ceil(loan.remainingBalance / loan.monthlyPayment) : 0;
                const targetDate = new Date();
                targetDate.setMonth(targetDate.getMonth() + monthsLeft);
                const payoffDate = targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                return (
                  <div key={loan.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 relative shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">{loan.name}</h3>
                        <p className="text-xs text-slate-400">{loan.notes || 'No description'}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${loan.status === 'Active' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{loan.status}</span>
                    </div>

                    <div className="space-y-1.5 text-xs pt-2 border-t border-slate-200">
                      <div className="flex justify-between text-slate-500"><span>Monthly Obligation:</span> <strong className="text-slate-800 font-mono">₱{loan.monthlyPayment.toFixed(2)}</strong></div>
                      <div className="flex justify-between text-slate-500"><span>Remaining Balance:</span> <strong className="text-red-500 font-mono font-bold">₱{loan.remainingBalance.toFixed(2)}</strong></div>
                      <div className="flex justify-between text-slate-500"><span>Duration Left:</span> <strong className="text-blue-600 font-bold">{monthsLeft} Months</strong></div>
                      <div className="flex justify-between text-slate-500"><span>Estimated Payoff:</span> <strong className="text-emerald-600 font-bold">{payoffDate}</strong></div>
                    </div>

                    <div className="pt-2 flex space-x-2">
                      <button onClick={() => { setModalType('loan'); setEditingItem(loan); setLoanForm(loan); setShowModal(true); }} className="w-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold py-1.5 rounded-xl border border-slate-200 transition">Edit Terms ✏️</button>
                      <button onClick={() => { const updated = loansList.filter(l => l.id !== loan.id); setLoansList(updated); syncToFirestore(budgetItems, updated, banksList, cardsList, salaryMoney, customSections); }} className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-xl text-xs border border-red-200">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: BANKS & SAVINGS */}
        {activeTab === 'savings' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Total Savings Balance</span>
                <p className="text-2xl font-extrabold text-blue-600 font-mono">₱{totalBankSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <button onClick={() => { setModalType('bank'); setEditingItem(null); setBankForm({ bankName: '', balance: '', accountType: 'Digital Bank' }); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition">+ Add Bank Account</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banksList.map(bank => (
                <div key={bank.id} className="bg-slate-50 p-5 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="font-bold text-slate-800">{bank.bankName}</h3>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-md mt-1 inline-block">{bank.accountType}</span>
                    <p className="text-xl font-extrabold font-mono text-emerald-600 mt-2">₱{parseFloat(bank.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="space-x-2">
                    <button onClick={() => { setModalType('bank'); setEditingItem(bank); setBankForm(bank); setShowModal(true); }} className="text-blue-500 hover:text-blue-700 text-xs">✏️</button>
                    <button onClick={() => { const updated = banksList.filter(b => b.id !== bank.id); setBanksList(updated); syncToFirestore(budgetItems, loansList, updated, cardsList, salaryMoney, customSections); }} className="text-red-400 hover:text-red-600 text-xs">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CREDIT CARDS */}
        {activeTab === 'cards' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Total Statement Credit Debt</span>
                <p className="text-2xl font-extrabold text-red-500 font-mono">₱{totalCreditDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <button onClick={() => { setModalType('card'); setEditingItem(null); setCardForm({ cardName: '', creditLimit: '', statementBalance: '', cutoffDate: '', dueDate: '' }); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition">+ Add Credit Card</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cardsList.map(card => (
                <div key={card.id} className="bg-slate-50 p-5 rounded-2xl space-y-3 border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">{card.cardName}</h3>
                    <div className="space-x-2">
                      <button onClick={() => { setModalType('card'); setEditingItem(card); setCardForm(card); setShowModal(true); }} className="text-blue-500 hover:text-blue-700 text-xs">✏️</button>
                      <button onClick={() => { const updated = cardsList.filter(c => c.id !== card.id); setCardsList(updated); syncToFirestore(budgetItems, loansList, banksList, updated, salaryMoney, customSections); }} className="text-red-400 hover:text-red-600 text-xs">🗑️</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>Limit: <strong className="text-slate-800 font-mono">₱{parseFloat(card.creditLimit).toFixed(2)}</strong></div>
                    <div>Balance: <strong className="text-red-500 font-mono">₱{parseFloat(card.statementBalance).toFixed(2)}</strong></div>
                    <div>Cutoff: <strong className="text-slate-800">{card.cutoffDate}</strong></div>
                    <div>Due Date: <strong className="text-amber-600">{card.dueDate}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* DYNAMIC MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold capitalize text-slate-800">{editingItem ? `Edit ${modalType}` : `Add New ${modalType}`}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3">
              {modalType === 'budgetItem' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Task / Description</label>
                    <input type="text" required value={budgetForm.task} onChange={e => setBudgetForm({ ...budgetForm, task: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Link to Tracker Loan (Optional)</label>
                    <select value={budgetForm.loanId} onChange={e => setBudgetForm({ ...budgetForm, loanId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800">
                      <option value="">None (General Expense)</option>
                      {loansList.map(loan => <option key={loan.id} value={loan.id}>{loan.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Savings / Bank Source</label>
                    <select value={budgetForm.bankName} onChange={e => setBudgetForm({ ...budgetForm, bankName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800">
                      {banksList.map(b => <option key={b.id} value={b.bankName}>{b.bankName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Amount (₱)</label>
                    <input type="number" step="0.01" required value={budgetForm.price} onChange={e => setBudgetForm({ ...budgetForm, price: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800" />
                  </div>
                </>
              )}

              {modalType === 'loan' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Loan Name</label>
                    <input type="text" required value={loanForm.name} onChange={e => setLoanForm({ ...loanForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Monthly Payment (₱)</label>
                    <input type="number" step="0.01" required value={loanForm.monthlyPayment} onChange={e => setLoanForm({ ...loanForm, monthlyPayment: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Remaining Debt (₱)</label>
                    <input type="number" step="0.01" required value={loanForm.remainingBalance} onChange={e => setLoanForm({ ...loanForm, remainingBalance: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Status</label>
                    <select value={loanForm.status} onChange={e => setLoanForm({ ...loanForm, status: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800">
                      <option value="Active">Active</option>
                      <option value="Fully Paid">Fully Paid</option>
                    </select>
                  </div>
                </>
              )}

              {modalType === 'bank' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Bank Name</label>
                    <input type="text" required value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Current Balance (₱)</label>
                    <input type="number" step="0.01" required value={bankForm.balance} onChange={e => setBankForm({ ...bankForm, balance: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800" />
                  </div>
                </>
              )}

              {modalType === 'card' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Card Name</label>
                    <input type="text" required value={cardForm.cardName} onChange={e => setCardForm({ ...cardForm, cardName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Limit (₱)</label>
                      <input type="number" required value={cardForm.creditLimit} onChange={e => setCardForm({ ...cardForm, creditLimit: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Balance (₱)</label>
                      <input type="number" required value={cardForm.statementBalance} onChange={e => setCardForm({ ...cardForm, statementBalance: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800" />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs bg-slate-100 text-slate-600 font-semibold rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
