import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Screen } from '../../components/Screen.jsx';
import { Card } from '../../components/Card.jsx';
import { Badge } from '../../components/Badge.jsx';
import * as workersApi from '../../api/workers.api.js';

const STATUS_COPY = {
  pending: {
    tone: 'warning',
    title: 'Verification pending',
    body: "We're reviewing your documents. This usually takes 1-2 business days.",
  },
  approved: {
    tone: 'success',
    title: "You're verified!",
    body: 'Customers can now find and book you for the services below.',
  },
  rejected: {
    tone: 'danger',
    title: 'Verification rejected',
    body: 'Something needs a second look. Please reapply with clearer documents.',
  },
};

export function WorkerStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workersApi
      .getMyWorkerData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data) return null;
  if (data.profile.verificationStatus === 'unsubmitted') {
    return <Navigate to="/worker/apply" replace />;
  }

  const copy = STATUS_COPY[data.profile.verificationStatus];

  return (
    <Screen>
      <h1 className="text-2xl font-bold">Worker dashboard</h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">{copy.title}</p>
            <Badge tone={copy.tone}>{data.profile.verificationStatus}</Badge>
          </div>
          <p className="mt-2 text-sm text-text-muted">{copy.body}</p>
        </Card>
      </motion.div>

      <Card className="mt-4">
        <p className="font-semibold">Your services</p>
        <div className="mt-3 flex flex-col gap-2">
          {data.services.map((service) => (
            <div key={service.id} className="flex items-center justify-between text-sm">
              <span className="text-text-muted">{service.serviceName}</span>
              <span className="font-medium">Rs. {service.price}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <p className="font-semibold">Submitted documents</p>
        <div className="mt-3 flex flex-col gap-2">
          {data.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between text-sm">
              <span className="text-text-muted capitalize">{doc.docType}</span>
              <Badge tone={STATUS_COPY[doc.status]?.tone ?? 'neutral'}>{doc.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </Screen>
  );
}
