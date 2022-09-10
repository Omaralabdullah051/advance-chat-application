import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const PublicRoute = ({ children }) => {
  const isLoggednIn = useAuth();

  return !isLoggednIn ? children : <Navigate to="/inbox" />;
};

export default PublicRoute;
