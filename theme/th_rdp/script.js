// th_rdp: the Favorites tab (myapps) is hidden in css/theme.css - start on Desktops instead
(function () {
    function showDesktops() {
        CTXS.Events.publish(CTXS.Events.ui.showDesktops);
    }

    var previousConfigLoaded = CTXS.Extensions.postConfigurationLoaded;
    CTXS.Extensions.postConfigurationLoaded = function () {
        var config = CTXS.Config._config;
        if (config && config.userInterface && config.userInterface.uiViews) {
            config.userInterface.uiViews.defaultView = "desktops";
        }
        if (previousConfigLoaded) { return previousConfigLoaded.apply(this, arguments); }
    };

    // Fallback: the Gateway plugin picks its own view after the app list is loaded
    var previousHomeScreen = CTXS.Extensions.afterDisplayHomeScreen;
    CTXS.Extensions.afterDisplayHomeScreen = function () {
        if (previousHomeScreen) { previousHomeScreen.apply(this, arguments); }
        setTimeout(showDesktops, 0);
    };
})();
