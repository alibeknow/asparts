# Переменные окружения

```javascript
process.env.NODE_ENV;
// Sync
parseInt(process.env.SYNC_STATUS_TIMEOUT, 10) || 2000;
process.env.SYNC_STATUS_HOST || 'localhost:3001';
process.env.SYNC_STATUS_PORT || '3001';
// Balance
parseInt(process.env.BALANCE_TIMEOUT, 10) || 2000;
process.env.SMSC_LOGIN || '';
process.env.SMSC_PASSWORD_MD5 || '';
const SELECTEL_API = process.env.SELECTEL_API || '';
```
