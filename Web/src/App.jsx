import { Routes, Route } from 'react-router';
import { RequireLogin } from './RequireLogin.jsx';
import { Login } from './screens/Login.jsx';
import { Register } from './screens/Register.jsx';
import { Home } from './screens/Home.jsx';
import { NewAccount } from './screens/NewAccount.jsx';
import { AccountDetail } from './screens/AccountDetail.jsx';
import { AdjustBalance } from './screens/AdjustBalance.jsx';
import { EditAccount } from './screens/EditAccount.jsx';
import { NotFound } from './screens/NotFound.jsx';

// One route per screen. Everything inside RequireLogin needs a session.
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<RequireLogin />}>
        <Route index element={<Home />} />
        <Route path="/accounts/new" element={<NewAccount />} />
        <Route path="/accounts/:id" element={<AccountDetail />} />
        <Route path="/accounts/:id/adjust" element={<AdjustBalance />} />
        <Route path="/accounts/:id/edit" element={<EditAccount />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
