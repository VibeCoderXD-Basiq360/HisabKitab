const CATEGORY_RULES = [
  { keywords: ['fuel', 'petrol', 'diesel', 'gas'], icon: '⛽', color: '#FF9800' },
  { keywords: ['food', 'eat', 'restaurant', 'dining', 'lunch', 'dinner', 'breakfast', 'snack', 'cafe'], icon: '🍔', color: '#FF5722' },
  { keywords: ['grocery', 'groceries', 'supermarket', 'vegetables', 'fruits', 'kirana'], icon: '🛒', color: '#4CAF50' },
  { keywords: ['transport', 'bus', 'auto', 'cab', 'taxi', 'metro', 'commute', 'rickshaw'], icon: '🚌', color: '#2196F3' },
  { keywords: ['medical', 'medicine', 'hospital', 'doctor', 'health', 'pharmacy', 'clinic'], icon: '💊', color: '#F44336' },
  { keywords: ['entertainment', 'movie', 'cinema', 'game', 'fun', 'leisure', 'outing'], icon: '🎬', color: '#9C27B0' },
  { keywords: ['bill', 'bills', 'electricity', 'water', 'internet', 'recharge', 'subscription', 'utility'], icon: '📄', color: '#607D8B' },
  { keywords: ['education', 'school', 'college', 'book', 'course', 'tuition', 'fees'], icon: '📚', color: '#3F51B5' },
  { keywords: ['shopping', 'clothes', 'clothing', 'fashion', 'shoes', 'apparel', 'amazon', 'flipkart'], icon: '🛍️', color: '#E91E63' },
  { keywords: ['travel', 'flight', 'hotel', 'trip', 'vacation', 'holiday', 'tour'], icon: '✈️', color: '#00BCD4' },
];

const PAYMENT_RULES = [
  { keywords: ['cash'], icon: '💵', color: '#4CAF50' },
  { keywords: ['upi', 'gpay', 'phonepe', 'paytm', 'bhim', 'google pay'], icon: '📱', color: '#2196F3' },
  { keywords: ['credit'], icon: '💳', color: '#9C27B0' },
  { keywords: ['debit'], icon: '🏦', color: '#FF5722' },
  { keywords: ['net banking', 'neft', 'imps', 'rtgs', 'bank transfer'], icon: '🏛️', color: '#607D8B' },
  { keywords: ['wallet', 'amazon pay'], icon: '👛', color: '#FF9800' },
  { keywords: ['cheque', 'check'], icon: '📝', color: '#795548' },
];

function getIconForCategory(name) {
  const lower = (name || '').toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return { icon: rule.icon, color: rule.color };
    }
  }
  return { icon: '💸', color: '#9E9E9E' };
}

function getIconForPaymentType(name) {
  const lower = (name || '').toLowerCase();
  for (const rule of PAYMENT_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return { icon: rule.icon, color: rule.color };
    }
  }
  return { icon: '💰', color: '#9E9E9E' };
}

module.exports = { getIconForCategory, getIconForPaymentType };
