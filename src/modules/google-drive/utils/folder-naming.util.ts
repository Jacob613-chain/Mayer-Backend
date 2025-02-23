export const generateFolderName = (customerName: string, repName: string): string => {
  // Remove special characters and normalize spaces
  const sanitizedCustomer = customerName.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const sanitizedRep = repName.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  
  // Create folder name in format: CustomerName - RepName
  return `${sanitizedCustomer} - ${sanitizedRep}`;
}; 