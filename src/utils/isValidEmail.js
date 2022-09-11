const isValidEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(/^\S+@\S+\.\S+$/);
};

export default isValidEmail;
