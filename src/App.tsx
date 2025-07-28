import { Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import './App.css';

function App() {
  const { theme, setTheme } = useStore();

  return (
    <div
      className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}
    >
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">React AI Template</h1>
          <p className="text-lg">
            All core libraries integrated and configured!
          </p>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </div>
  );
}

function Home() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Home Page</h2>
      <p>Core dependencies successfully configured:</p>
      <ul className="mt-4 space-y-2">
        <li>✅ Tailwind CSS</li>
        <li>✅ React Router v6</li>
        <li>✅ Zustand State Management</li>
        <li>✅ React Query</li>
        <li>✅ React Hook Form + Zod</li>
        <li>✅ Axios HTTP Client</li>
      </ul>
    </div>
  );
}

function About() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">About Page</h2>
      <p>This demonstrates React Router navigation.</p>
    </div>
  );
}

export default App;
