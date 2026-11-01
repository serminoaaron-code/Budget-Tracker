const { useState, useEffect, useMemo } = React;

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyB-yU1YT45okpa8UoLvGnfSvZNOQ42Rntg",
  authDomain: "budget-tracker-c96eb.firebaseapp.com",
  projectId: "budget-tracker-c96eb",
  storageBucket: "budget-tracker-c96eb.firebasestorage.app",
  messagingSenderId: "476510198306",
  appId: "1:476510198306:web:9cbe6eda5718a7ca5fc87b"
};

// Initial sample items matching your spreadsheet
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

  const toggleSection = (sec) => {
    setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleAddSection = (e) => {
    e.preventDefault();
    const formatted = newSectionName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!formatted) return;
    if (customSections.includes(formatted) || formatted === 'loan' || formatted === 'expenses') return;
    setCustomSections([...customSections, formatted]);
    setNewSectionName('');
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    const priceNum = parseFloat(form.price) || 0;
    const qtyNum = parseFloat(form.quantity) || 1;

    if (editingItem) {
      setBudgetItems(budgetItems.map(i => i.id === editingItem.id ? { ...form, price: priceNum, quantity: qtyNum, id: i.id } : i));
    } else {
      setBudgetItems([...budgetItems, { ...form, price: priceNum, quantity: qtyNum, id: Date.now().toString() }]);
    }
    setShowModal(false);
  };

  const totalExpenses = useMemo(() => {
    return budgetItems.filter(i => i.section !== 'loan').reduce((s, i) => s + (i.price * i.quantity), 0);
  }, [budgetItems]);

  const remainingMoney = salaryMoney - totalExpenses;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-cyan-400">Budget Tracker</h1>
          <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-400">Live Web App</span>
        </header>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400 uppercase">Salary Money</span>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xl text-slate-400">₱</span>
              <input
                type="number"
                value={salaryMoney}
                onChange={(e) => setSalaryMoney(parseFloat(e.target.value) || 0)}
                className="bg-slate-950 border border-slate-800 text-2xl font-bold text-slate-100 rounded-xl px-3 py-1 w-full font-mono"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Expenses</span>
            <p className="text-3xl font-extrabold text-rose-400 font-mono mt-2">
              ₱{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400 uppercase">Remaining Money</span>
            <p className={`text-3xl font-extrabold font-mono mt-2 ${remainingMoney >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
              ₱{remainingMoney.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Section Creator */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <span className="text-sm font-semibold">Custom Sections</span>
          <form onSubmit={handleAddSection} className="flex space-x-2">
            <input
              type="text"
              placeholder="_____ (type new section)"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-1.5 text-sm"
            />
            <button type="submit" className="bg-cyan-500 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-sm">
              + Add
            </button>
          </form>
        </div>

        {/* Tables */}
        {['loan', 'expenses', ...customSections].map(secKey => {
          const items = budgetItems.filter(i => i.section === secKey);
          const total = items.reduce((s, i) => s + (i.price * i.quantity), 0);
          const isCollapsed = collapsedSections[secKey];

          return (
            <div key={secKey} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <button onClick={() => toggleSection(secKey)} className="text-slate-400">
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
