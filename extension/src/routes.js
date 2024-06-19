import paymentController from './api/payment/payment.controller.js'
import orderController from './api/order/order.controller.js'

const routes = {
  '/': paymentController.processRequest,
  '/create-order': orderController.processRequest,
}

export { routes }
