import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const PrivateRoute = ({ children }) => {
  const isLoggednIn = useAuth();

  return isLoggednIn ? children : <Navigate to="/" />;
};

export default PrivateRoute;
