const FIBONACCI_WEEKS = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]

export function getFibonacciWeeks(index) {
  if (index < 0) return FIBONACCI_WEEKS[0]
  if (index >= FIBONACCI_WEEKS.length) return FIBONACCI_WEEKS[FIBONACCI_WEEKS.length - 1]
  return FIBONACCI_WEEKS[index]
}

export function calculateNextReviewDate(currentDate, fibonacciIndex) {
  const weeks = getFibonacciWeeks(fibonacciIndex)
  const nextDate = new Date(currentDate)
  nextDate.setDate(nextDate.getDate() + weeks * 7)
  return nextDate
}

export function isExpired(paperAddedDate, expiryYears, nextReviewDate) {
  if (expiryYears === 999) return false
  
  const added = new Date(paperAddedDate)
  const expiry = new Date(added)
  expiry.setFullYear(expiry.getFullYear() + expiryYears)
  
  const review = new Date(nextReviewDate)
  return review > expiry
}
