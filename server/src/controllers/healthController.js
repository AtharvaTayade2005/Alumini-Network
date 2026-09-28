export function health(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'Alumni Network Portal API',
  })
}

export default { health }
