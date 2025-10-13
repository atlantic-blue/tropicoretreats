/* eslint-disable */
export enum Routes {
  DASHBOARD = '/*',
  COURSES = '/courses',
  EXPLORE = '/explore',
  MY_LEARNING = 'MY_LEARNING',
  SETTINGS = '/settings',

  AUTHZ_LOGIN = '/login',
  AUTHZ_LOGOUT = '/logout',
  AUTH_CALLBACK = '/callback',

  USER_SETTINGS = '/user/settings',

  PAYMENTS = '/payments/:priceId',
}

class AppRoutes {
  getHomeRoute() {
    return `/`;
  }

  getLoginRoute() {
    return `${Routes.AUTHZ_LOGIN}`;
  }

  getLogoutRoute() {
    return `${Routes.AUTHZ_LOGOUT}`;
  }

  getCourses() {
    return `${Routes.COURSES}`;
  }

  getExplore() {
    return `${Routes.EXPLORE}`;
  }

  getMyLearning() {
    return `${Routes.MY_LEARNING}`;
  }

  getSettings() {
    return `${Routes.SETTINGS}`;
  }

  getUserSettings() {
    return `${Routes.USER_SETTINGS}`;
  }

  getPayment(priceId: string) {
    return `payments/${priceId}`;
  }
}

export const appRoutes = new AppRoutes();
