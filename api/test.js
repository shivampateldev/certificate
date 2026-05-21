module.exports = (req, res) => {
    res.status(200).json({ status: 'Alive', message: 'API is working' });
};
