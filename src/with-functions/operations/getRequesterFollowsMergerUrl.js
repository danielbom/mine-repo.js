module.exports = ({ requesterLogin, mergerLogin }) =>
  `https://api.github.com/users/${requesterLogin}/following/${mergerLogin}`;
