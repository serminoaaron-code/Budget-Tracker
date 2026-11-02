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

const initialItems = [
  { id: '1', task: 'Mariloan', category: 'loan', section: 'loan', price: 1918.16, quantity: 1, status: 'Pending', fundSource: 'SeaBank', totalLoanAmount: 11508.96 },
  { id: '2', task: 'SB Loan', category: 'loan', section: 'loan', price: 6352.66, quantity: 1, status: 'Pending', fundSource: 'Maya', totalLoanAmount: 38115.96 },
  { id: '3', task: 'MB loan', category: 'loan', section: 'loan', price: 2323.34, quantity: 1, status: 'Pending', fundSource: 'BDO', totalLoanAmount: 13940.04 },
  { id: '4', task: 'RCBC loan', category: 'loan', section: 'loan', price: 1091.99, quantity: 1, status: 'Pending', fundSource: 'GoTyme', totalLoanAmount: 6551.94 },
  { id: '5', task: 'Leanne', category: 'loan', section: 'loan', price: 2426.99, quantity: 1, status: 'Pending', fundSource: 'Cash', totalLoanAmount: 14561.94 },
  { id: '9', task: 'fun money', category: 'Expenses', section: 'expenses', price: 1500.00, quantity: 1, status: 'Paid', fundSource: 'SeaBank', totalLoanAmount: 0 },
  { id: '10', task: 'Savings', category: 'Savings', section: 'expenses', price: 3000.00, quantity: 1, status: 'Paid', fundSource: 'BDO', totalLoanAmount: 0 },
  { id: '11', task: 'Google', category: 'Bills', section: 'expenses', price: 700.00, quantity: 1, status: 'Paid', fundSource: 'Maya', totalLoanAmount: 0 },
  { id: '12', task: 'Necessities', category: 'Expenses', section: 'expenses', price: 1000.00, quantity: 1, status: 'Paid', fundSource: 'GoTyme', totalLoanAmount: 0 },
  { id: '13', task: 'transpo', category: 'Expenses', section: 'expenses', price: 1300.00, quantity: 1, status: 'Paid', fundSource: 'Cash', totalLoanAmount: 0 }
];

const availableFundSources = ['SeaBank', 'Maya', 'GoTyme', 'BDO', 'BPI', 'GCash', 'Cash'];

function App() {
  const [user, setUser] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('budget'); // 'budget' | 'loans'
  const [salaryMoney, setSalaryMoney] = useState(18000);
  const [budgetItems, setBudgetItems] = useState(initialItems);
  const [customSections, setCustomSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({ loan: false, expenses: false });
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({
    task: '', category: 'Expenses', section: 'expenses', price: '', quantity: 1, status: 'Pending', fundSource: 'SeaBank', totalLoanAmount: ''
  });

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Sync state to Firestore safely
  const syncToFirestore = async (newItems, newSalary, newSections) => {
    if (!user || isDemoMode) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        budgetItems: newItems !== undefined ? newItems : budgetItems,
        salaryMoney: newSalary !== undefined ? newSalary : salaryMoney,
        customSections: newSections !== undefined ? newSections : customSections,
      }, { merge: true });
    } catch (e) {
      console.error("Firestore sync failed:", e);
    }
  };

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Listener
  useEffect(() => {
    if (!user || isDemoMode) return;
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.budgetItems) setBudgetItems(data.budgetItems);
        if (data.salaryMoney !== undefined) setSalaryMoney(data.salaryMoney);
        if (data.customSections) setCustomSections(data.customSections);
      } else {
        setDoc(userDocRef, {
          budgetItems: initialItems,
          salaryMoney: 18000,
          customSections: []
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

  const openAddItemModal = (secKey) => {
    setEditingItem(null);
    setForm({
      task: '',
      category: secKey === 'loan' ? 'loan' : 'Expenses',
      section: secKey,
      price: '',
      quantity: 1,
      status: 'Pending',
      fundSource: 'SeaBank',
      totalLoanAmount: ''
    });
    setShowModal(true);
  };

  const openEditItemModal = (item) => {
    setEditingItem(item);
    setForm({
      task: item.task,
      category: item.category,
      section: item.section || 'expenses',
      price: item.price,
      quantity: item.quantity,
      status: item.status || 'Pending',
      fundSource: item.fundSource || 'SeaBank',
      totalLoanAmount: item.totalLoanAmount || ''
    });
    setShowModal(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    const priceNum = parseFloat(form.price) || 0;
    const qtyNum = parseFloat(form.quantity) || 1;
    const totalLoanNum = parseFloat(form.totalLoanAmount) || 0;

    let updated;
    if (editingItem) {
      updated = budgetItems.map(i => i.id === editingItem.id ? { ...form, price: priceNum, quantity: qtyNum, totalLoanAmount: totalLoanNum, id: i.id } : i);
    } else {
      const newItem = { ...form, price: priceNum, quantity: qtyNum, totalLoanAmount: totalLoanNum, id: Date.now().toString() };
      updated = [...budgetItems, newItem];
    }

    setBudgetItems(updated);
    setShowModal(false);
    syncToFirestore(updated, salaryMoney, customSections);
  };

  const handleDeleteItem = (id) => {
    const updated = budgetItems.filter(i => i.id !== id);
    setBudgetItems(updated);
    syncToFirestore(updated, salaryMoney, customSections);
  };

  // Calculations
  const totalPaidExpenses = useMemo(() => {
    return budgetItems.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.price * i.quantity), 0);
  }, [budgetItems]);

  const totalPendingExpenses = useMemo(() => {
    return budgetItems.filter(i => i.status === 'Pending').reduce((s, i) => s + (i.price * i.quantity), 0);
  }, [budgetItems]);

  const actualCashAvailable = salaryMoney - totalPaidExpenses;
  const netSpendableMoney = salaryMoney - (totalPaidExpenses + totalPendingExpenses);

  // Pie Chart Effect
  useEffect(() => {
    if ((!user && !isDemoMode) || activeTab !== 'budget' || !chartRef.current) return;

    const categoryTotals = {};
    budgetItems.forEach(item => {
      const cat = item.category || 'Other';
      const val = item.price * item.quantity;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }
    });
  }, [budgetItems, user, isDemoMode, activeTab]);

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400 font-bold">Loading Budget Tracker...</div>;

  if (!user && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-cyan-400">Budget Tracker</h1>
            <p className="text-xs text-slate-400 mt-1">Sign in to manage your budget & loans</p>
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
            <h1 className="text-2xl font-bold text-cyan-400">Budget Tracker</h1>
            <p className="text-xs text-slate-400">{isDemoMode ? 'Demo Mode' : `User: ${user?.email}`}</p>
          </div>
          <button onClick={() => { signOut(auth); setIsDemoMode(false); }} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs px-3 py-1.5 rounded-xl transition">Sign Out</button>
        </header>

        {/* Tab Selector */}
        <div className="flex space-x-2 border-b border-slate-800 pb-2">
          <button onClick={() => setActiveTab('budget')} className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'budget' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}>📊 Expense & Budget Dashboard</button>
          <button onClick={() => setActiveTab('loans')} className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'loans' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}>🏦 Loan Payoff Tracker</button>
        </div>

        {/* Warning Banner */}
        {netSpendableMoney < 0 && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between text-red-400 text-xs">
            <span>⚠️ <strong>Warning: Insufficient Funds!</strong> Your pending obligations exceed your salary by ₱{Math.abs(netSpendableMoney).toFixed(2)}. Verify your funding source.</span>
          </div>
        )}

        {/* OVERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-xs text-slate-400 uppercase font-semibold">Salary Income</span>
            <div className="flex items-center space-x-1 mt-1">
              <span className="text-slate-400 text-base">₱</span>
              <input type="number" value={salaryMoney} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setSalaryMoney(val); syncToFirestore(budgetItems, val, customSections); }} className="bg-slate-950 border border-slate-800 text-lg font-bold text-slate-100 rounded-xl px-2 py-0.5 w-full font-mono" />
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
            <span className="text-xs text-slate-400 uppercase font-semibold">Net Safe Spendable</span>
            <p className={`text-xl font-bold font-mono mt-1 ${netSpendableMoney >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>₱{netSpendableMoney.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {activeTab === 'budget' ? (
          <>
            {/* Custom Section Creator */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <span className="text-sm font-semibold">Add Custom Section</span>
              <form onSubmit={(e) => { e.preventDefault(); const formatted = newSectionName.trim().toLowerCase().replace(/\s+/g, '_'); if (!formatted || customSections.includes(formatted)) return; const updated = [...customSections, formatted]; setCustomSections(updated); setNewSectionName(''); syncToFirestore(budgetItems, salaryMoney, updated); }} className="flex space-x-2">
                <input type="text" placeholder="e.g. Subscriptions" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-1.5 text-sm" />
                <button type="submit" className="bg-cyan-500 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-sm">+ Add</button>
              </form>
            </div>

            {/* Budget Tables */}
            {['loan', 'expenses', ...customSections].map(secKey => {
              const items = budgetItems.filter(i => i.section === secKey);
              const total = items.reduce((s, i) => s + (i.price * i.quantity), 0);
              const isCollapsed = collapsedSections[secKey];

              return (
                <div key={secKey} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 bg-slate-800/50 flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => setCollapsedSections(prev => ({ ...prev, [secKey]: !prev[secKey] }))} className="text-slate-400 hover:text-slate-200">{isCollapsed ? '▼' : '▲'}</button>
                      <h2 className="font-bold capitalize">{secKey.replace(/_/g, ' ')} Section</h2>
                    </div>
                    <button onClick={() => openAddItemModal(secKey)} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3 py-1.5 rounded-lg transition">+ Add Row</button>
                  </div>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase border-b border-slate-800">
                          <tr>
                            <th className="p-3">Task</th>
                            <th className="p-3">Fund / Bank</th>
                            <th className="p-3 text-right">Monthly / Price</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {items.length === 0 ? (
                            <tr><td colSpan="5" className="p-4 text-center text-slate-500 italic text-xs">No rows yet. Click "+ Add Row" above.</td></tr>
                          ) : (
                            items.map(item => (
                              <tr key={item.id} className="hover:bg-slate-800/30 transition">
                                <td className="p-3 font-medium text-slate-200">{item.task}</td>
                                <td className="p-3 text-xs"><span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-md">{item.fundSource || 'SeaBank'}</span></td>
                                <td className="p-3 text-right font-mono font-bold">₱{(item.price * item.quantity).toFixed(2)}</td>
                                <td className="p-3 text-center text-xs">
                                  <span className={`px-2 py-0.5 rounded-full ${item.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{item.status || 'Pending'}</span>
                                </td>
                                <td className="p-3 text-right space-x-2">
                                  <button onClick={() => openEditItemModal(item)} className="text-slate-400 hover:text-cyan-400 text-xs">✏️</button>
                                  <button onClick={() => handleDeleteItem(item.id)} className="text-slate-400 hover:text-red-400 text-xs">🗑️</button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      <div className="p-4 bg-slate-950/80 flex justify-between items-center font-bold border-t border-slate-800">
                        <span className="text-xs uppercase text-slate-400">Total</span>
                        <span className="text-cyan-400 font-mono text-lg">₱{total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          /* LOAN PAYOFF TRACKER TAB */
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-cyan-400 border-b border-slate-800 pb-2">🏦 Loan Payoff & Duration Summary</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {budgetItems.filter(i => i.section === 'loan').map(loan => {
                  const monthly = loan.price * loan.quantity;
                  const totalLoan = loan.totalLoanAmount || monthly * 6; // fallback estimate
                  const monthsRemaining = monthly > 0 ? Math.ceil(totalLoan / monthly) : 0;
                  
                  // Calculate future target end date
                  const targetDate = new Date();
                  targetDate.setMonth(targetDate.getMonth() + monthsRemaining);
                  const formattedDate = targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                  return (
                    <div key={loan.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-200">{loan.task}</h3>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">{loan.fundSource || 'SeaBank'}</span>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-400"><span>Monthly Payment:</span> <strong className="text-slate-200 font-mono">₱{monthly.toFixed(2)}</strong></div>
                        <div className="flex justify-between text-slate-400"><span>Total Remaining:</span> <strong className="text-slate-200 font-mono">₱{totalLoan.toFixed(2)}</strong></div>
                        <div className="flex justify-between text-slate-400"><span>Duration Left:</span> <strong className="text-cyan-400 font-bold">{monthsRemaining} Months</strong></div>
                        <div className="flex justify-between text-slate-400"><span>Payoff Until:</span> <strong className="text-emerald-400 font-bold">{formattedDate}</strong></div>
                      </div>

                      <button onClick={() => openEditItemModal(loan)} className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs py-1.5 rounded-lg transition text-slate-300">Edit Terms & Balance ✏️</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold">{editingItem ? 'Edit Item' : 'Add Item'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Task / Loan Name</label>
                <input type="text" required value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Monthly Payment (₱)</label>
                  <input type="number" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Total Remaining Debt (₱)</label>
                  <input type="number" step="0.01" value={form.totalLoanAmount} onChange={e => setForm({ ...form, totalLoanAmount: e.target.value })} placeholder="e.g. 12000" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Fund Source / Bank</label>
                <select value={form.fundSource} onChange={e => setForm({ ...form, fundSource: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm">
                  {availableFundSources.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm">
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

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
