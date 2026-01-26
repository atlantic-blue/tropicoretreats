import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

/**
 * SNS client singleton - initialized outside handler for reuse
 * across warm Lambda invocations.
 */
const snsClient = new SNSClient({});

/**
 * Send SMS to a phone number via AWS SNS.
 *
 * @param phoneNumber - E.164 formatted phone number (+14155551234)
 * @param message - SMS message (keep under 160 GSM characters)
 * @throws Error if SNS publish fails
 */
export const sendSMS = async (
  phoneNumber: string,
  message: string
): Promise<void> => {
  try {
    await snsClient.send(
      new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional', // Highest reliability
          },
        },
      })
    );
  } catch (error) {
    // Log without exposing phone number in error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`SMS send failed: ${errorMessage}`);
  }
};
