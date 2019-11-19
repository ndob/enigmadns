import { combineReducers} from 'redux';
import { reducer as formReducer } from 'redux-form';

const notifyMessageReducer = (notification = {open: false, message: ''}, action) => {
    if (action.type === 'MESSAGE_NOTIFIED') {
        return action.payload;
    }

    return notification;
};

export default combineReducers({
    notification: notifyMessageReducer,
    form: formReducer
});
