const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const { htmlToText } = require('html-to-text');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // Gmail SMTP configuration
    if (process.env.EMAIL_SERVICE === 'gmail') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // Gmail App Password
        }
      });
    }

    // SendGrid configuration
    if (process.env.EMAIL_SERVICE === 'sendgrid') {
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    }

    // Default SMTP configuration
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendEmail(options) {
    try {
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'MarketPlace Pro',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || htmlToText(options.html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email göndərildi: ${options.to} - ${options.subject}`);
      return result;
    } catch (error) {
      console.error('❌ Email göndərmə xətası:', error);
      throw error;
    }
  }

  // Welcome email template
  getWelcomeTemplate(userData) {
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Xoş gəlmisiniz!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Xoş gəlmisiniz!</h1>
          </div>
          <div class="content">
            <h2>Salam {{firstName}} {{lastName}}!</h2>
            <p>MarketPlace Pro ailənə xoş gəlmisiniz! Hesabınız uğurla yaradıldı.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>📋 Hesab Məlumatları:</h3>
              <p><strong>Ad:</strong> {{firstName}} {{lastName}}</p>
              <p><strong>Email:</strong> {{email}}</p>
              <p><strong>Rol:</strong> {{role}}</p>
              <p><strong>Qeydiyyat tarixi:</strong> {{createdAt}}</p>
            </div>

            {{#if isVendor}}
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>🏪 Vendor Hesabınız</h3>
              <p>Vendor kimi məhsullarınızı əlavə edə və satış edə bilərsiniz!</p>
            </div>
            {{/if}}

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{loginUrl}}" class="button">Hesabıma Daxil Ol</a>
            </div>

            <p>Sualınız varsa, bizimlə əlaqə saxlaya bilərsiniz: 
              <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2024 MarketPlace Pro. Bütün hüquqlar qorunur.</p>
            <p>🌐 <a href="{{websiteUrl}}">{{websiteUrl}}</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      role: userData.role === 'vendor' ? 'Satıcı' : userData.role === 'admin' ? 'Admin' : 'Müştəri',
      createdAt: new Date(userData.createdAt).toLocaleDateString('az-AZ'),
      isVendor: userData.role === 'vendor',
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@marketplace.com',
      websiteUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
    });
  }

  // Order confirmation email template
  getOrderConfirmationTemplate(orderData) {
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Sifarişiniz Qəbul Edildi</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .order-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
          .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total { background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .button { background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Sifarişiniz Qəbul Edildi!</h1>
          </div>
          <div class="content">
            <h2>Salam {{customerName}}!</h2>
            <p>Sifarişiniz uğurla qəbul edildi və emal edilməyə başlandı.</p>
            
            <div class="order-box">
              <h3>📋 Sifariş Məlumatları</h3>
              <p><strong>Sifariş Nömrəsi:</strong> {{orderNumber}}</p>
              <p><strong>Sifariş Tarixi:</strong> {{orderDate}}</p>
              <p><strong>Status:</strong> <span style="color: #28a745;">{{orderStatus}}</span></p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>📦 Sifarişinizin Tərkibi</h3>
              {{#each items}}
              <div class="item">
                <div>
                  <strong>{{productName}}</strong><br>
                  <small>Miqdar: {{quantity}} ədəd</small>
                </div>
                <div>
                  <strong>{{totalPrice}} AZN</strong>
                </div>
              </div>
              {{/each}}
            </div>

            <div class="total">
              <h3>💰 Ödəniş Məlumatları</h3>
              <div style="display: flex; justify-content: space-between;">
                <span>Alt məbləğ:</span>
                <span>{{subtotal}} AZN</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Vergi:</span>
                <span>{{tax}} AZN</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Çatdırılma:</span>
                <span>{{shipping}} AZN</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 2px solid #28a745;">
                <span>Ümumi məbləğ:</span>
                <span>{{total}} AZN</span>
              </div>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>🚚 Çatdırılma Ünvanı</h3>
              <p>{{shippingAddress.firstName}} {{shippingAddress.lastName}}</p>
              <p>{{shippingAddress.street}}</p>
              <p>{{shippingAddress.city}}, {{shippingAddress.country}}</p>
              <p>Tel: {{shippingAddress.phone}}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{orderUrl}}" class="button">Sifarişi İzləyin</a>
            </div>

            <p><strong>Nə vaxt çatacaq?</strong> Sifarişiniz 2-5 iş günü ərzində çatdırılacaq.</p>
            <p>Sualınız varsa, bizimlə əlaqə saxlaya bilərsiniz: 
              <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2024 MarketPlace Pro. Bütün hüquqlar qorunur.</p>
            <p>🌐 <a href="{{websiteUrl}}">{{websiteUrl}}</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate({
      customerName: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
      orderNumber: orderData.orderNumber,
      orderDate: new Date(orderData.placedAt).toLocaleDateString('az-AZ'),
      orderStatus: 'Qəbul edildi',
      items: orderData.vendorOrders.flatMap(vo => 
        vo.items.map(item => ({
          productName: item.productSnapshot.name,
          quantity: item.quantity,
          totalPrice: item.totalPrice
        }))
      ),
      subtotal: orderData.pricing.subtotal,
      tax: orderData.pricing.tax,
      shipping: orderData.pricing.shipping,
      total: orderData.pricing.total,
      shippingAddress: orderData.shippingAddress,
      orderUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${orderData._id}`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@marketplace.com',
      websiteUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
    });
  }

  // Order status update email template
  getOrderStatusTemplate(orderData, newStatus) {
    const statusMessages = {
      confirmed: {
        title: '✅ Sifarişiniz Təsdiqləndi',
        message: 'Sifarişiniz təsdiqləndi və hazırlanmağa başlandı.',
        color: '#28a745'
      },
      processing: {
        title: '⚙️ Sifarişiniz Hazırlanır',
        message: 'Sifarişiniz hazırlanır və tezliklə göndəriləcək.',
        color: '#ffc107'
      },
      shipped: {
        title: '🚚 Sifarişiniz Göndərildi',
        message: 'Sifarişiniz göndərildi və yolda.',
        color: '#17a2b8'
      },
      delivered: {
        title: '🎉 Sifarişiniz Çatdırıldı',
        message: 'Sifarişiniz uğurla çatdırıldı.',
        color: '#6f42c1'
      }
    };

    const status = statusMessages[newStatus] || statusMessages.confirmed;

    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>{{title}}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: {{color}}; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { background: {{color}}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>{{title}}</h1>
          </div>
          <div class="content">
            <h2>Salam {{customerName}}!</h2>
            <p>{{message}}</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>📋 Sifariş Məlumatları</h3>
              <p><strong>Sifariş Nömrəsi:</strong> {{orderNumber}}</p>
              <p><strong>Yeni Status:</strong> <span style="color: {{color}};">{{statusText}}</span></p>
              <p><strong>Yenilənmə Tarixi:</strong> {{updateDate}}</p>
            </div>

            {{#if trackingNumber}}
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>📍 İzləmə Məlumatları</h3>
              <p><strong>İzləmə Nömrəsi:</strong> {{trackingNumber}}</p>
              <p><strong>Daşıma Şirkəti:</strong> {{carrier}}</p>
              {{#if trackingUrl}}
              <p><a href="{{trackingUrl}}" target="_blank">İzləmə Linkini Açın</a></p>
              {{/if}}
            </div>
            {{/if}}

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{orderUrl}}" class="button">Sifarişi İzləyin</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; 2024 MarketPlace Pro. Bütün hüquqlar qorunur.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate({
      title: status.title,
      message: status.message,
      color: status.color,
      customerName: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
      orderNumber: orderData.orderNumber,
      statusText: status.title.replace(/[^\w\s]/g, '').trim(),
      updateDate: new Date().toLocaleDateString('az-AZ'),
      trackingNumber: orderData.vendorOrders[0]?.tracking?.trackingNumber,
      carrier: orderData.vendorOrders[0]?.tracking?.carrier,
      trackingUrl: orderData.vendorOrders[0]?.tracking?.trackingUrl,
      orderUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${orderData._id}`
    });
  }

  // Vendor new order notification
  getVendorOrderTemplate(orderData, vendorOrder) {
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Yeni Sifariş Aldınız</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛍️ Yeni Sifariş Aldınız!</h1>
          </div>
          <div class="content">
            <h2>Təbriklər!</h2>
            <p>Yeni bir sifariş aldınız. Zəhmət olmasa sifarişi yoxlayın və təsdiq edin.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>📋 Sifariş Məlumatları</h3>
              <p><strong>Sifariş Nömrəsi:</strong> {{orderNumber}}</p>
              <p><strong>Vendor Sifariş Nömrəsi:</strong> {{vendorOrderNumber}}</p>
              <p><strong>Sifariş Tarixi:</strong> {{orderDate}}</p>
              <p><strong>Müştəri:</strong> {{customerName}}</p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>📦 Sifarişinizin Tərkibi</h3>
              {{#each items}}
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                <div>
                  <strong>{{productName}}</strong><br>
                  <small>Miqdar: {{quantity}} ədəd</small>
                </div>
                <div>
                  <strong>{{totalPrice}} AZN</strong>
                </div>
              </div>
              {{/each}}
            </div>

            <div style="background: #ffe8e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>💰 Gəliriniz</h3>
              <p><strong>Ümumi məbləğ:</strong> {{total}} AZN</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{vendorOrderUrl}}" class="button">Sifarişi İdarə Edin</a>
            </div>

            <p><strong>Nə etməlisiniz?</strong></p>
            <ol>
              <li>Sifarişi yoxlayın</li>
              <li>Məhsulların mövcud olduğunu təsdiq edin</li>
              <li>Sifarişi təsdiq edin</li>
              <li>Məhsulları hazırlayın və göndərin</li>
            </ol>
          </div>
          <div class="footer">
            <p>&copy; 2024 MarketPlace Pro. Bütün hüquqlar qorunur.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate({
      orderNumber: orderData.orderNumber,
      vendorOrderNumber: vendorOrder.vendorOrderNumber,
      orderDate: new Date(orderData.placedAt).toLocaleDateString('az-AZ'),
      customerName: `${orderData.customer.firstName} ${orderData.customer.lastName}`,
      items: vendorOrder.items.map(item => ({
        productName: item.productSnapshot.name,
        quantity: item.quantity,
        totalPrice: item.totalPrice
      })),
      total: vendorOrder.total,
      vendorOrderUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vendor/orders/${orderData._id}`
    });
  }

  // Send welcome email
  async sendWelcomeEmail(userData) {
    const html = this.getWelcomeTemplate(userData);
    await this.sendEmail({
      to: userData.email,
      subject: `🎉 Xoş gəlmisiniz ${userData.firstName}!`,
      html
    });
  }

  // Send order confirmation email
  async sendOrderConfirmationEmail(orderData) {
    const html = this.getOrderConfirmationTemplate(orderData);
    await this.sendEmail({
      to: orderData.customer.email,
      subject: `✅ Sifarişiniz qəbul edildi - ${orderData.orderNumber}`,
      html
    });
  }

  // Send order status update email
  async sendOrderStatusEmail(orderData, newStatus) {
    const html = this.getOrderStatusTemplate(orderData, newStatus);
    const statusTitles = {
      confirmed: 'Sifarişiniz təsdiqləndi',
      processing: 'Sifarişiniz hazırlanır',
      shipped: 'Sifarişiniz göndərildi',
      delivered: 'Sifarişiniz çatdırıldı'
    };

    await this.sendEmail({
      to: orderData.customer.email,
      subject: `📦 ${statusTitles[newStatus]} - ${orderData.orderNumber}`,
      html
    });
  }

  // Send vendor order notification
  async sendVendorOrderEmail(vendorEmail, orderData, vendorOrder) {
    const html = this.getVendorOrderTemplate(orderData, vendorOrder);
    await this.sendEmail({
      to: vendorEmail,
      subject: `🛍️ Yeni sifariş aldınız - ${orderData.orderNumber}`,
      html
    });
  }
}

module.exports = new EmailService();