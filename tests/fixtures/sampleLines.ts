// Synthetic OCPP client-log lines in the real format the parser expects
// (`>> message sent:` / `<< message received:` markers, leading `[timestamp]`).
// Hand-built so expected parse results are deterministic.

export const SAMPLE_LINES: string[] = [
  '[2025-08-22T02:50:56.554Z] %c[OCPPClient] >> message sent: [2,"id1","BootNotification",{"chargePointVendor":"Ador","chargePointModel":"DC-60"}] color: cyan;',
  '[2025-08-22T02:50:56.688Z] %c[OCPPClient] << message received: [3,"id1",{"status":"Accepted","currentTime":"2025-08-22T02:50:56Z","interval":300}] color: cyan;',
  '[2025-08-22T02:51:00.000Z] %c[OCPPClient] >> message sent: [2,"id2","Heartbeat",{}] color: cyan;',
  '[2025-08-22T02:51:00.100Z] %c[OCPPClient] << message received: [3,"id2",{"currentTime":"2025-08-22T02:51:00Z"}] color: cyan;',
  '[2025-08-22T02:51:05.000Z] %c[OCPPClient] >> message sent: [2,"id3","DataTransfer",{"vendorId":"QUENCH"}] color: cyan;',
  '[2025-08-22T03:00:00.000Z] handling [OCPP] event {"type":"alert","chargerId":"CP1","outlet":"1","payload":{"code":"E01","msg":"Test alert","session":"s1"}}',
  '[2025-08-22T03:00:00.500Z] handling [OCPP] event {"type":"status","chargerId":"CP1","outlet":"1","payload":{"foo":"bar"}}',
  '[2025-08-22T03:00:01.000Z] [OCPPRuntime] New State --> stop Transaction {"transactionId":12345,"internalTransactionId":"internal_transId_abc"}',
  'Stored transactionId 67890 for internalTransactionId internal_transId_def',
  '[2025-08-22T03:00:02.000Z] some unrelated log line with no markers',
];
