const CartPage = () => {
  return (
    <div style={{ padding: '6rem 2rem 2rem', textAlign: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#6366f1' }}>🛒 Alış-veriş Səbəti</h1>
      <p style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '2rem' }}>
        Səbət məhsulları və checkout burada olacaq
      </p>
      <div style={{ background: '#f1f5f9', padding: '2rem', borderRadius: '12px', maxWidth: '600px', margin: '0 auto' }}>
        <p><strong>Planned Features:</strong></p>
        <ul style={{ textAlign: 'left', marginTop: '1rem' }}>
          <li>📦 Cart items list</li>
          <li>🔢 Quantity management</li>
          <li>💰 Price calculation</li>
          <li>🎯 Checkout process</li>
          <li>🏷️ Discount codes</li>
          <li>🚚 Shipping options</li>
        </ul>
      </div>
    </div>
  );
};

export default CartPage;