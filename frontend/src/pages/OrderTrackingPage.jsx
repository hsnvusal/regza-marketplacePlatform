import React, { useState, useEffect } from 'react';
import { 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Truck, 
  AlertCircle,
  Search,
  ExternalLink,
  Phone,
  Mail,
  Copy,
  Eye,
  Calendar,
  Loader
} from 'lucide-react';

const OrderTrackingPage = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Demo data for testing
  const demoTrackingData = {
    orderNumber: 'ORD-202412-789123456',
    placedAt: '2024-12-18T10:30:00Z',
    estimatedDelivery: '2024-12-22T16:00:00Z',
    status: 'shipped',
    customer: {
      firstName: 'Əli',
      lastName: 'Məmmədov'
    },
    shippingAddress: {
      street: 'Nizami küçəsi 123',
      city: 'Bakı',
      phone: '+994 50 123 45 67'
    },
    tracking: {
      trackingNumber: 'TR123456789AZ',
      carrier: 'azerpost',
      carrierName: 'Azərpoçt Express',
      currentStatus: 'in_transit',
      trackingUrl: 'https://azerpost.az/track/TR123456789AZ',
      lastUpdated: '2024-12-20T14:30:00Z',
      estimatedDelivery: '2024-12-22T16:00:00Z',
      trackingHistory: [
        {
          status: 'shipped',
          description: 'Məhsul göndərildi və kargo şirkətinə təhvil verildi',
          timestamp: '2024-12-18T16:45:00Z',
          location: { city: 'Bakı', address: 'Mərçant Sortirovka Mərkəzi' }
        },
        {
          status: 'in_transit',
          description: 'Məhsul daşınma mərhələsindədir',
          timestamp: '2024-12-19T08:20:00Z',
          location: { city: 'Bakı', address: 'Azərpoçt Baş Poçt Şöbəsi' }
        },
        {
          status: 'in_transit',
          description: 'Məhsul son çatdırılma məntəqəsinə çatdı',
          timestamp: '2024-12-20T14:30:00Z',
          location: { city: 'Bakı', address: '28 May Poçt Şöbəsi' }
        }
      ]
    },
    vendorOrders: [
      {
        vendor: { businessName: 'TechnoShop AZ' },
        status: 'shipped',
        tracking: {
          trackingNumber: 'TR123456789AZ',
          carrier: 'azerpost',
          currentStatus: 'in_transit',
          trackingHistory: [
            {
              status: 'shipped',
              description: 'Məhsul hazırlandı və göndərildi',
              timestamp: '2024-12-18T16:45:00Z'
            }
          ]
        },
        items: [
          {
            productSnapshot: {
              name: 'iPhone 15 Pro 256GB',
              image: '📱'
            },
            quantity: 1
          }
        ]
      }
    ]
  };

  const trackOrder = async () => {
    if (!trackingNumber.trim()) {
      setError('Tracking nömrəsini daxil edin');
      return;
    }

    setLoading(true);
    setError('');
    setTrackingData(null);

    try {
      // For demo purposes, use demo data if tracking number matches
      if (trackingNumber.toUpperCase() === 'TR123456789AZ' || trackingNumber.toUpperCase() === 'DEMO') {
        setTimeout(() => {
          setTrackingData(demoTrackingData);
          setLoading(false);
        }, 1500);
        return;
      }

      // Real API call
      const response = await fetch(`/api/orders/track/${trackingNumber}`);
      const data = await response.json();

      if (data.success) {
        setTrackingData(data.data);
      } else {
        setError(data.message || 'Tracking məlumatı tapılmadı');
      }
    } catch (err) {
      setError('Tracking məlumatı yoxlanılarkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      trackOrder();
    }
  };

  const copyTrackingNumber = async () => {
    if (trackingData?.tracking?.trackingNumber) {
      try {
        await navigator.clipboard.writeText(trackingData.tracking.trackingNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('az-AZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    const iconProps = { size: 20, style: { minWidth: '20px', minHeight: '20px' } };
    
    switch(status) {
      case 'shipped':
        return <Package {...iconProps} style={{...iconProps.style, color: '#3b82f6'}} />;
      case 'in_transit':
        return <Truck {...iconProps} style={{...iconProps.style, color: '#f97316'}} />;
      case 'out_for_delivery':
        return <MapPin {...iconProps} style={{...iconProps.style, color: '#8b5cf6'}} />;
      case 'delivered':
        return <CheckCircle {...iconProps} style={{...iconProps.style, color: '#10b981'}} />;
      case 'failed_delivery':
        return <AlertCircle {...iconProps} style={{...iconProps.style, color: '#ef4444'}} />;
      case 'returned':
        return <AlertCircle {...iconProps} style={{...iconProps.style, color: '#6b7280'}} />;
      default:
        return <Clock {...iconProps} style={{...iconProps.style, color: '#6b7280'}} />;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'shipped': 'Göndərildi',
      'in_transit': 'Yoldadır',
      'out_for_delivery': 'Çatdırılma üçün yolda',
      'delivered': 'Çatdırıldı',
      'failed_delivery': 'Çatdırılma uğursuz',
      'returned': 'Geri qaytarıldı'
    };
    return statusMap[status] || status;
  };

  const getStatusStyles = (status) => {
    const styleMap = {
      'shipped': {
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        borderColor: '#93c5fd'
      },
      'in_transit': {
        backgroundColor: '#fed7aa',
        color: '#c2410c',
        borderColor: '#fdba74'
      },
      'out_for_delivery': {
        backgroundColor: '#e9d5ff',
        color: '#7c3aed',
        borderColor: '#c4b5fd'
      },
      'delivered': {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        borderColor: '#86efac'
      },
      'failed_delivery': {
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        borderColor: '#fca5a5'
      },
      'returned': {
        backgroundColor: '#f3f4f6',
        color: '#374151',
        borderColor: '#d1d5db'
      }
    };
    return styleMap[status] || styleMap['returned'];
  };

  const getCarrierInfo = (carrier) => {
    const carriers = {
      'azerpost': { name: 'Azərpoçt', website: 'https://azerpost.az' },
      'bravo': { name: 'Bravo Express', website: 'https://bravo.az' },
      'express': { name: 'Express Post', website: '#' },
      'pickup': { name: 'Özü götürmə', website: '#' },
      'other': { name: 'Digər', website: '#' }
    };
    return carriers[carrier] || { name: carrier, website: '#' };
  };

  // Inline styles to ensure CSS works
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #faf5ff 100%)',
      padding: '2rem 1rem'
    },
    maxWidth: {
      maxWidth: '64rem',
      margin: '0 auto'
    },
    headerContainer: {
      textAlign: 'center',
      marginBottom: '2rem'
    },
    iconContainer: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '4rem',
      height: '4rem',
      backgroundColor: '#dbeafe',
      borderRadius: '50%',
      marginBottom: '1rem'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '0.5rem'
    },
    subtitle: {
      color: '#6b7280',
      maxWidth: '28rem',
      margin: '0 auto'
    },
    searchCard: {
      backgroundColor: 'white',
      borderRadius: '1rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '2rem',
      marginBottom: '2rem',
      border: '1px solid #e5e7eb'
    },
    searchContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    },
    inputContainer: {
      position: 'relative',
      flex: 1
    },
    searchIcon: {
      position: 'absolute',
      left: '1rem',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9ca3af'
    },
    input: {
      width: '100%',
      paddingLeft: '3rem',
      paddingRight: '1rem',
      paddingTop: '1rem',
      paddingBottom: '1rem',
      border: '2px solid #e5e7eb',
      borderRadius: '0.75rem',
      fontSize: '1.125rem',
      outline: 'none',
      transition: 'all 0.2s'
    },
    button: {
      padding: '1rem 2rem',
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      color: 'white',
      borderRadius: '0.75rem',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontWeight: '600',
      transition: 'all 0.2s',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    demoHint: {
      marginTop: '1rem',
      textAlign: 'center'
    },
    demoText: {
      fontSize: '0.875rem',
      color: '#6b7280'
    },
    demoCode: {
      backgroundColor: '#f3f4f6',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      fontFamily: 'monospace'
    },
    errorContainer: {
      marginTop: '1.5rem',
      backgroundColor: '#fef2f2',
      borderLeft: '4px solid #f87171',
      borderRadius: '0.5rem',
      padding: '1rem'
    },
    errorContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      color: '#b91c1c'
    },
    loadingCard: {
      backgroundColor: 'white',
      borderRadius: '1rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '2rem',
      textAlign: 'center'
    },
    loadingIcon: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '4rem',
      height: '4rem',
      backgroundColor: '#dbeafe',
      borderRadius: '50%',
      marginBottom: '1rem'
    },
    loadingTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#111827',
      marginBottom: '0.5rem'
    },
    resultCard: {
      backgroundColor: 'white',
      borderRadius: '1rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '2rem',
      border: '1px solid #e5e7eb',
      marginBottom: '1.5rem'
    },
    flexBetween: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1.5rem',
      flexWrap: 'wrap'
    },
    orderTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '0.5rem'
    },
    orderMeta: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '1rem',
      color: '#6b7280'
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    statusBadge: {
      padding: '0.75rem 1.5rem',
      borderRadius: '9999px',
      border: '1px solid',
      fontSize: '1.125rem',
      fontWeight: '600'
    },
    trackingTitle: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '1.5rem'
    },
    currentStatusCard: {
      background: 'linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%)',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      border: '1px solid #dbeafe'
    },
    statusInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      marginBottom: '0.5rem'
    },
    statusText: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      color: '#111827'
    },
    lastUpdate: {
      color: '#6b7280'
    },
    trackingMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem',
      flexWrap: 'wrap'
    },
    trackingNumber: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.5rem'
    },
    trackingCode: {
      backgroundColor: 'white',
      padding: '0.75rem',
      borderRadius: '0.5rem',
      fontFamily: 'monospace',
      fontSize: '0.875rem',
      border: '1px solid #e5e7eb'
    },
    copyButton: {
      padding: '0.25rem',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '0.25rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    carrier: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    timelineContainer: {
      marginTop: '1.5rem'
    },
    timelineTitle: {
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '1.5rem',
      fontSize: '1.125rem'
    },
    timelineItem: {
      position: 'relative',
      marginBottom: '1rem'
    },
    timelineLine: {
      position: 'absolute',
      left: '1.5rem',
      top: '3rem',
      width: '2px',
      height: '2rem',
      backgroundColor: '#e5e7eb'
    },
    timelineContent: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem',
      padding: '1rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.75rem',
      transition: 'background-color 0.2s'
    },
    timelineDetails: {
      flex: 1,
      minWidth: 0
    },
    timelineHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.5rem',
      flexWrap: 'wrap'
    },
    timelineStatus: {
      fontWeight: '600',
      color: '#111827'
    },
    timelineTimestamp: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#111827',
      flexShrink: 0
    },
    timelineDescription: {
      color: '#6b7280',
      marginBottom: '0.5rem'
    },
    timelineLocation: {
      fontSize: '0.875rem',
      color: '#6b7280',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem'
    },
    vendorSection: {
      marginTop: '1.5rem'
    },
    vendorTitle: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '1rem'
    },
    vendorCard: {
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      padding: '1.5rem',
      border: '1px solid #e5e7eb',
      marginBottom: '1rem'
    },
    vendorHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem',
      marginBottom: '1rem',
      flexWrap: 'wrap'
    },
    vendorName: {
      fontWeight: 'bold',
      color: '#111827',
      fontSize: '1.125rem'
    },
    vendorTracking: {
      fontSize: '0.875rem',
      color: '#6b7280'
    },
    itemsSection: {
      marginBottom: '1rem'
    },
    itemsTitle: {
      fontWeight: '600',
      color: '#111827',
      marginBottom: '0.5rem'
    },
    itemContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.5rem',
      marginBottom: '0.5rem'
    },
    itemEmoji: {
      fontSize: '1.5rem'
    },
    itemDetails: {
      flex: 1
    },
    itemName: {
      fontWeight: '500',
      color: '#111827'
    },
    itemQuantity: {
      fontSize: '0.875rem',
      color: '#6b7280'
    },
    recentActivity: {
      marginTop: '0.5rem'
    },
    activityTitle: {
      fontWeight: '600',
      color: '#111827',
      marginBottom: '0.5rem'
    },
    activityItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontSize: '0.875rem',
      padding: '0.5rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.5rem',
      marginBottom: '0.5rem'
    },
    activityStatus: {
      flex: 1,
      fontWeight: '500'
    },
    activityTime: {
      color: '#6b7280'
    },
    contactCard: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      borderRadius: '1rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '2rem',
      color: 'white',
      marginTop: '1.5rem'
    },
    contactTitle: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      marginBottom: '1rem'
    },
    contactGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem'
    },
    contactItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    contactIcon: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      padding: '0.75rem',
      borderRadius: '0.5rem'
    },
    contactLabel: {
      fontWeight: '600'
    },
    contactValue: {
      color: '#bfdbfe'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.headerContainer}>
          <div style={styles.iconContainer}>
            <Package size={32} color="#3b82f6" />
          </div>
          <h1 style={styles.title}>Sifariş İzləmə</h1>
          <p style={styles.subtitle}>
            Tracking nömrənizi daxil edərək sifarişinizin real vaxt mövqeyini öyrənin
          </p>
        </div>

        {/* Search Section */}
        <div style={styles.searchCard}>
          <div style={styles.searchContainer}>
            <div style={styles.inputContainer}>
              <div style={styles.searchIcon}>
                <Search size={20} />
              </div>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                onKeyPress={handleInputKeyPress}
                placeholder="Tracking nömrəsini daxil edin (məs: TR123456789AZ)"
                style={{
                  ...styles.input,
                  ...(trackingNumber ? {borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'} : {})
                }}
              />
            </div>
            <button
              onClick={trackOrder}
              disabled={loading || !trackingNumber.trim()}
              style={{
                ...styles.button,
                ...(loading || !trackingNumber.trim() ? styles.buttonDisabled : {})
              }}
            >
              {loading ? (
                <>
                  <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Yoxlanılır...
                </>
              ) : (
                <>
                  <Search size={20} />
                  İzlə
                </>
              )}
            </button>
          </div>

          {/* Demo hint */}
          <div style={styles.demoHint}>
            <p style={styles.demoText}>
              Demo üçün: <span style={styles.demoCode}>TR123456789AZ</span> və ya <span style={styles.demoCode}>DEMO</span> daxil edin
            </p>
          </div>

          {error && (
            <div style={styles.errorContainer}>
              <div style={styles.errorContent}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: '500' }}>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div style={styles.loadingCard}>
            <div style={styles.loadingIcon}>
              <Loader size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h3 style={styles.loadingTitle}>Tracking məlumatı axtarılır...</h3>
            <p style={{ color: '#6b7280' }}>Zəhmət olmasa gözləyin</p>
          </div>
        )}

        {/* Tracking Results */}
        {trackingData && !loading && (
          <div>
            {/* Order Overview */}
            <div style={styles.resultCard}>
              <div style={styles.flexBetween}>
                <div>
                  <h2 style={styles.orderTitle}>
                    Sifariş #{trackingData.orderNumber}
                  </h2>
                  <div style={styles.orderMeta}>
                    <div style={styles.metaItem}>
                      <Calendar size={16} />
                      <span>Sifariş tarixi: {formatDate(trackingData.placedAt)}</span>
                    </div>
                    {trackingData.estimatedDelivery && (
                      <div style={styles.metaItem}>
                        <Clock size={16} />
                        <span>Təxmini çatdırılma: {formatDate(trackingData.estimatedDelivery)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{
                  ...styles.statusBadge,
                  ...getStatusStyles(trackingData.status)
                }}>
                  {getStatusText(trackingData.status)}
                </div>
              </div>
            </div>

            {/* Main Tracking Info */}
            {trackingData.tracking && (
              <div style={styles.resultCard}>
                <h3 style={styles.trackingTitle}>Çatdırılma Məlumatı</h3>
                
                {/* Current Status Card */}
                <div style={styles.currentStatusCard}>
                  <div style={styles.trackingMeta}>
                    <div style={styles.statusInfo}>
                      {getStatusIcon(trackingData.tracking.currentStatus)}
                      <div>
                        <p style={styles.statusText}>
                          {getStatusText(trackingData.tracking.currentStatus)}
                        </p>
                        <p style={styles.lastUpdate}>Son yeniləmə: {formatDate(trackingData.tracking.lastUpdated)}</p>
                      </div>
                    </div>
                    <div>
                      <div style={styles.trackingNumber}>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Tracking:</span>
                        <span style={styles.trackingCode}>
                          {trackingData.tracking.trackingNumber}
                        </span>
                        <button
                          onClick={copyTrackingNumber}
                          style={{
                            ...styles.copyButton,
                            backgroundColor: copied ? '#d1fae5' : 'transparent'
                          }}
                          title="Kopyala"
                        >
                          <Copy size={16} color={copied ? '#065f46' : '#6b7280'} />
                        </button>
                      </div>
                      <div style={styles.carrier}>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Daşıyıcı:</span>
                        <span style={{ fontWeight: '600' }}>{getCarrierInfo(trackingData.tracking.carrier).name}</span>
                        {trackingData.tracking.trackingUrl && (
                          <a
                            href={trackingData.tracking.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#3b82f6', textDecoration: 'none' }}
                            title="Daşıyıcı saytında izlə"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tracking Timeline */}
                {trackingData.tracking.trackingHistory && trackingData.tracking.trackingHistory.length > 0 && (
                  <div style={styles.timelineContainer}>
                    <h4 style={styles.timelineTitle}>İzləmə Tarixçəsi</h4>
                    <div>
                      {trackingData.tracking.trackingHistory.map((event, index) => (
                        <div key={index} style={styles.timelineItem}>
                          {/* Timeline line */}
                          {index < trackingData.tracking.trackingHistory.length - 1 && (
                            <div style={styles.timelineLine}></div>
                          )}
                          
                          <div style={{
                            ...styles.timelineContent,
                            ':hover': { backgroundColor: '#f3f4f6' }
                          }}>
                            <div style={{ flexShrink: 0, marginTop: '0.25rem' }}>
                              {getStatusIcon(event.status)}
                            </div>
                            <div style={styles.timelineDetails}>
                              <div style={styles.timelineHeader}>
                                <div>
                                  <p style={styles.timelineStatus}>
                                    {getStatusText(event.status)}
                                  </p>
                                  {event.description && (
                                    <p style={styles.timelineDescription}>{event.description}</p>
                                  )}
                                  {event.location && (
                                    <p style={styles.timelineLocation}>
                                      <MapPin size={12} />
                                      {event.location.city}
                                      {event.location.address && ` - ${event.location.address}`}
                                    </p>
                                  )}
                                </div>
                                <div style={styles.timelineTimestamp}>
                                  {formatDate(event.timestamp)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Vendor Orders */}
            {trackingData.vendorOrders && trackingData.vendorOrders.length > 0 && (
              <div style={styles.vendorSection}>
                <h3 style={styles.vendorTitle}>Vendor Sifarişləri</h3>
                {trackingData.vendorOrders.map((vendorOrder, index) => (
                  <div key={index} style={styles.vendorCard}>
                    <div style={styles.vendorHeader}>
                      <div>
                        <h4 style={styles.vendorName}>{vendorOrder.vendor.businessName}</h4>
                        {vendorOrder.tracking?.trackingNumber && (
                          <p style={styles.vendorTracking}>
                            Tracking: <span style={styles.trackingCode}>{vendorOrder.tracking.trackingNumber}</span>
                          </p>
                        )}
                      </div>
                      <div style={{
                        ...styles.statusBadge,
                        ...getStatusStyles(vendorOrder.status),
                        fontSize: '0.875rem',
                        padding: '0.5rem 1rem'
                      }}>
                        {getStatusText(vendorOrder.status)}
                      </div>
                    </div>

                    {/* Vendor Items */}
                    {vendorOrder.items && (
                      <div style={styles.itemsSection}>
                        <h5 style={styles.itemsTitle}>Məhsullar:</h5>
                        <div>
                          {vendorOrder.items.map((item, itemIndex) => (
                            <div key={itemIndex} style={styles.itemContainer}>
                              <span style={styles.itemEmoji}>{item.productSnapshot?.image || '📦'}</span>
                              <div style={styles.itemDetails}>
                                <p style={styles.itemName}>{item.productSnapshot?.name || 'Məhsul'}</p>
                                <p style={styles.itemQuantity}>Miqdar: {item.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vendor Tracking History */}
                    {vendorOrder.tracking?.trackingHistory && (
                      <div style={styles.recentActivity}>
                        <h5 style={styles.activityTitle}>Son aktivliklər:</h5>
                        {vendorOrder.tracking.trackingHistory.slice(0, 3).map((event, eventIndex) => (
                          <div key={eventIndex} style={styles.activityItem}>
                            {getStatusIcon(event.status)}
                            <span style={styles.activityStatus}>{getStatusText(event.status)}</span>
                            <span style={styles.activityTime}>
                              {formatDate(event.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Contact Info */}
            <div style={styles.contactCard}>
              <h3 style={styles.contactTitle}>Kömək lazımdır?</h3>
              <div style={styles.contactGrid}>
                <div style={styles.contactItem}>
                  <div style={styles.contactIcon}>
                    <Phone size={24} />
                  </div>
                  <div>
                    <p style={styles.contactLabel}>Dəstək xətti</p>
                    <p style={styles.contactValue}>+994 12 123 45 67</p>
                  </div>
                </div>
                <div style={styles.contactItem}>
                  <div style={styles.contactIcon}>
                    <Mail size={24} />
                  </div>
                  <div>
                    <p style={styles.contactLabel}>Email dəstək</p>
                    <p style={styles.contactValue}>support@example.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animation for spinner */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        [style*="animation: spin"] {
          animation: spin 1s linear infinite !important;
        }

        @media (min-width: 768px) {
          .search-container {
            flex-direction: row !important;
          }
          
          .flex-between {
            flex-direction: row !important;
          }
          
          .timeline-header {
            flex-direction: row !important;
          }
          
          .vendor-header {
            flex-direction: row !important;
          }
          
          .tracking-meta {
            flex-direction: row !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderTrackingPage;