export const notifyMessage = (notification) => {
    return {
        type: 'MESSAGE_NOTIFIED',
        payload: notification
    };
};
