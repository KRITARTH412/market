import { useEffect, useState } from 'react';
import { CreditCard, Download, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Table from '../../components/Table';
import useAuthStore from '../../store/authStore';

export default function Billing() {
  const { organization } = useAuthStore();
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const [subRes, invRes, usageRes] = await Promise.all([
        api.get('/billing/subscription'),
        api.get('/billing/invoices'),
        api.get('/billing/usage'),
      ]);
      
      setSubscription(subRes.data.subscription);
      setInvoices(invRes.data.invoices);
      setUsage(usageRes.data.usage);
    } catch (error) {
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (plan) => {
    toast.info(`Upgrade to ${plan} coming soon!`);
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const plans = [
    {
      name: 'Starter',
      price: 999,
      features: [
        '1 Project',
        '100 Documents',
        '1,000 AI Queries/month',
        '5 Team Members',
        'Email Support',
      ],
    },
    {
      name: 'Professional',
      price: 2999,
      popular: true,
      features: [
        '10 Projects',
        '1,000 Documents',
        '10,000 AI Queries/month',
        '20 Team Members',
        'Priority Support',
        'Custom Branding',
      ],
    },
    {
      name: 'Enterprise',
      price: 9999,
      features: [
        'Unlimited Projects',
        'Unlimited Documents',
        'Unlimited AI Queries',
        'Unlimited Team Members',
        '24/7 Support',
        'Custom Integration',
        'Dedicated Account Manager',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your subscription and billing</p>
      </div>

      {/* Current Plan */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Current Plan</h2>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {subscription?.plan || 'Trial'}
            </p>
            <p className="text-gray-600">
              {subscription?.status === 'active' ? 'Active' : 'Trial'} • 
              Renews on {formatDate(subscription?.renewalDate || new Date())}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(subscription?.amount || 0)}
            </p>
            <p className="text-gray-600">per month</p>
          </div>
        </div>
      </Card>

      {/* Usage */}
      {usage && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage This Month</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">AI Queries</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">{usage.queries || 0}</p>
                <p className="text-sm text-gray-500">/ {usage.queryLimit || '∞'}</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min((usage.queries / usage.queryLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Documents</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">{usage.documents || 0}</p>
                <p className="text-sm text-gray-500">/ {usage.documentLimit || '∞'}</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${Math.min((usage.documents / usage.documentLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Team Members</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl font-bold text-gray-900">{usage.members || 0}</p>
                <p className="text-sm text-gray-500">/ {usage.memberLimit || '∞'}</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${Math.min((usage.members / usage.memberLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.popular ? 'border-2 border-blue-500' : ''}>
              {plan.popular && (
                <Badge variant="primary" className="mb-4">Most Popular</Badge>
              )}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-4">
                {formatCurrency(plan.price)}
                <span className="text-base font-normal text-gray-600">/month</span>
              </p>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.popular ? 'primary' : 'outline'}
                className="w-full"
                onClick={() => handleUpgrade(plan.name)}
              >
                {subscription?.plan === plan.name ? 'Current Plan' : 'Upgrade'}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Billing History
          </h2>
        </div>
        {invoices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No invoices yet</p>
        ) : (
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Header>Date</Table.Header>
                <Table.Header>Description</Table.Header>
                <Table.Header>Amount</Table.Header>
                <Table.Header>Status</Table.Header>
                <Table.Header>Actions</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {invoices.map((invoice) => (
                <Table.Row key={invoice._id}>
                  <Table.Cell>{formatDate(invoice.date)}</Table.Cell>
                  <Table.Cell>{invoice.description}</Table.Cell>
                  <Table.Cell>{formatCurrency(invoice.amount)}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'}>
                      {invoice.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <button
                      onClick={() => handleDownloadInvoice(invoice._id)}
                      className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Card>
    </div>
  );
}
