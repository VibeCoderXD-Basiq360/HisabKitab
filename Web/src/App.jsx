import { Routes, Route } from 'react-router';

// One route per screen. The placeholder goes when the first screen arrives.
export function App() {
  return (
    <Routes>
      <Route path="*" element={<h1>HisabKitab</h1>} />
    </Routes>
  );
}
