const { useState, useEffect, useMemo, useRef } = React;

// --- Firebase Configuration ---
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
  { id: '1', task: 'Mariloan', category: 'loan', section: 'loan', price: 1918.16, quantity: 0.5, status: 'Pending' },
  { id: '2', task: 'SB Loan', category: 'loan', section: 'loan', price: 6352.66, quantity: 0.5, status: 'Pending' },
  { id: '3', task: 'MB loan', category: 'loan', section: 'loan', price: 2323.34, quantity: 0.5, status: 'Pending' },
  { id: '4', task: 'RCBC loan', category: 'loan', section: 'loan', price: 1091.99, quantity: 0.5, status: 'Pending' },
  { id: '5', task: 'Leanne', category: 'loan', section: 'loan', price: 2426.99, quantity: 0.5, status: 'Pending' },
  { id: '6', task: 'TV', category: 'loan', section: 'loan', price: 750.00, quantity: 0.5, status: 'Pending' },
  { id: '7', task: 'La Vero', category: 'loan', section: 'loan', price: 1036.19, quantity: 0.5, status: 'Pending' },
  { id: '8', task: 'Muji', category: 'loan', section: 'loan', price: 773.04, quantity: 0.5, status: 'Pending' },
  { id: '9', task: 'fun money', category: 'Expenses', section: 'expenses', price: 1500.00, quantity: 1, status: 'Paid' },
  { id: '10', task: 'Savings', category: 'Savings', section: 'expenses', price: 3000.00, quantity: 1, status: 'Paid' },
  { id: '11', task: 'Google', category: 'Bills', section: 'expenses', price: 700.00, quantity: 1, status: 'Paid' },
  { id: '12', task: 'Necessities', category: 'Expenses', section: 'expenses', price: 1000.00, quantity: 1, status: 'Paid' },
  { id: '13', task: 'transpo', category: 'Expenses', section: 'expenses', price: 1300.00, quantity: 1, status: 'Paid' },
  { id: '14', task: 'Bills', category: 'Bills', section: 'expenses', price: 200.00, quantity: 0.5, status: 'Paid' },
  { id: '15', task: 'Globe plan/Netflix', category: 'Bills', section: 'expenses', price: 1448.00, quantity: 0.5, status: 'Paid' },
  { id: '16', task: 'Loveey', category: 'Gift', section: 'expenses', price: 2500.00, quantity: 0.5, status: 'Paid' },
];

function App() {
  const [user, setUser] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [salaryMoney, setSalaryMoney] = useState(18000);
  const [budgetItems, setBudgetItems] = useState(initialItems);
  const [customSections, setCustomSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({ loan: true });
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({
    task: '', category: 'Expenses', section: 'expenses', price: '', quantity: 1, status: 'Pending'
  });

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync Listener
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
      console.error(e);
    }
  };

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

  const totalExpenses = useMemo(() => {
    return budgetItems.filter(i => i.section !== 'loan').reduce((s, i) => s + (i.price * i.quantity), 0);
  }, [budgetItems]);

  const remainingMoney = salaryMoney - totalExpenses;

  // Render Pie Chart
  useEffect(() => {
    if ((!user && !isDemoMode) || !chartRef.current) return;

    const categoryTotals = {};
    budgetItems.forEach(item => {
      const cat = item.category || 'Other';
      const val = item.price * item.quantity;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', 
            '#f59e0b', '#10b981', '#64748b', '#f43f5e'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { size: 12 } }
          }
        }
      }
    });
  }, [budgetItems, user, isDemoMode]);

  if (authLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400">Loading...</div>;
  }

  // Login / Signup Screen
  if (!user && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-cyan-400">Budget Tracker</h1>
            <p className="text-xs text-slate-400 mt-1">Sign in to sync your financial data</p>
          </div>

          {authError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">EMAIL</label>
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">PASSWORD</label>
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100"
              />
            </div>
            <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm">
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 space-y-2">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-cyan-400 underline">
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
            <br />
            <button onClick={() => setIsDemoMode(true)} className="text-slate-500 underline">
              Try Offline Demo Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Screen
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">Budget Tracker</h1>
            <p className="text-xs text-slate-400">{isDemoMode ? 'Demo Mode' : `User: ${user?.email}`}</p>
          </div>
          <button onClick={() => { signOut(auth); setIsDemoMode(false); }} className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs px-3 py-1.5 rounded-xl">
            Sign Out
          </button>
        </header>

        {/* Top Cards & Pie Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 uppercase font-semibold">Salary Money</span>
              <div className="flex items-center space-x-1 mt-2">
                <span className="text-slate-400 text-lg">₱</span>
                <input
                  type="number" value={salaryMoney}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setSalaryMoney(val);
                    syncToFirestore(budgetItems, val, customSections);
                  }}
                  className="bg-slate-950 border border-slate-800 text-2xl font-bold text-slate-100 rounded-xl px-3 py-1 w-full font-mono"
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Expenses</span>
              <p className="text-2xl font-extrabold text-rose-400 font-mono mt-2">
                ₱{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 uppercase font-semibold">Remaining Money</span>
              <p className={`text-2xl font-extrabold font-mono mt-2 ${remainingMoney >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                ₱{remainingMoney.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Pie Chart Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col items-center justify-center">
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-4">Expense Breakdown</h3>
            <div className="w-48 h-48">
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
        </div>

        {/* Section Creator */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <span className="text-sm font-semibold">Custom Sections</span>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formatted = newSectionName.trim().toLowerCase().replace(/\s+/g, '_');
            if (!formatted || customSections.includes(formatted)) return;
            const updated = [...customSections, formatted];
            setCustomSections(updated);
            setNewSectionName('');
            syncToFirestore(budgetItems, salaryMoney, updated);
          }} className="flex space-x-2">
            <input
              type="text" placeholder="_____ (type section name)" value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-1.5 text-sm"
            />
            <button type="submit" className="bg-cyan-500 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-sm">
              + Add
            </button>
          </form>
        </div>

        {/* Budget Tables */}
        {['loan', 'expenses', ...customSections].map(secKey => {
          const items = budgetItems.filter(i => i.section === secKey);
          const total = items.reduce((s, i) => s + (i.price * i.quantity), 0);
          const isCollapsed = collapsedSections[secKey];

          return (
            <div key={secKey} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <button onClick={() => setCollapsedSections(prev => ({ ...prev, [secKey]: !prev[secKey] }))} className="text-slate-400">
                    {isCollapsed ? '▼' : '▲'}
                  </button>
                  <h2 className="font-bold capitalize">{secKey.replace(/_/g, ' ')} Section</h2>
                </div>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setForm({ task: '', category: secKey === 'loan' ? 'loan' : 'Expenses', section: secKey, price: '', quantity: 1, status: 'Pending' });
                    setShowModal(true);
                  }}
                  className="bg-slate-800 border border-slate-700 text-xs px-3 py-1.5 rounded-lg"
                >
                  + Add Row
                </button>
              </div>

              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3">Task</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {items.map(item => (
                        <tr key={item.id}>
                          <td className="p-3 font-medium">{item.task}</td>
                          <td className="p-3 text-xs">{item.category}</td>
                          <td className="p-3 text-right font-mono">₱{item.price.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono">{item.quantity}</td>
                          <td className="p-3 text-right font-mono font-bold">₱{(item.price * item.quantity).toFixed(2)}</td>
                          <td className="p-3 text-center text-xs">{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-4 bg-slate-950/80 flex justify-between items-center font-bold">
                    <span>Total</span>
                    <span className="text-cyan-400 font-mono">₱{total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
