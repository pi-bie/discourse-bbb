import { withPluginApi } from "discourse/lib/plugin-api";
import showModal from "discourse/lib/show-modal";
import { iconHTML } from "discourse-common/lib/icon-library";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { isAppWebview } from "discourse/lib/utilities";

function launchBBB($elem) {
  const data = $elem.data(),
    site = Discourse.__container__.lookup("site:main");

  ajax("/bbb/create.json", {
    type: "POST",
    data: data,
  })
    .then((res) => {
      if (res.url) {
        if (
          isAppWebview() ||
          (site.mobileView && !data.mobileIframe) ||
          (!site.mobileView && !data.desktopIframe)
        ) {
          window.location.href = res.url;
        } else {
          $elem.children().hide();
          $elem.append(
            `<iframe src="${res.url}" allowfullscreen="true" allow="camera; microphone; fullscreen; speaker" width="100%" height="500" style="border:none"></iframe>`
          );
        }
      }
    })
    .catch(function(error) {
      popupAjaxError(error);
    });
}

function attachButton($elem) {
  const data = $elem.data();
  const buttonLabel = $elem.data("label") || I18n.t("bbb.launch");
  const buttonTitleNotYet = I18n.t("bbb.launch_notyet");
  
  $elem.html(
        `<button class='launch-bbb btn'>${iconHTML(
          "video"
        )} ${buttonLabel}</button>`
      );
  
  ajax(`/bbb/running/${data.meetingID}.json`).then((res) => {
    if (res.running || !data.joinonly) {
      $elem.find("button").on("click", () => launchBBB($elem));  
    } else {
      $elem.find("button").attr({title: buttonTitleNotYet});
      $elem.find("button").html(`${iconHTML(
          "video"
        )} ${buttonLabel}<br><small>(${buttonTitleNotYet})</small>`);
    }
  });
}

function attachStatus($elem, helper) {
  const status = $elem.find(".bbb-status");
  const data = $elem.data();

  ajax(`/bbb/status/${data.meetingID}.json`).then((res) => {
    if (!res.running && !data.joinonly) {
      status.html(`<span>Meeting not yet running</span>`);
    }
    else if (res.avatars) {
      status.html(`<span>On the call: </span>`);
      res.avatars.forEach(function(avatar) {
        status.append(
          `<img src="${avatar.avatar_url}" class="avatar" width="25" height="25" title="${avatar.name}" />`
        );
      });
    }
  });
}

function attachBBB($elem, helper) {
  if (helper) {
    $elem.find("[data-wrap=discourse-bbb]").each((idx, val) => {
      attachButton($(val));
      $(val).append("<span class='bbb-status'></span>");
      attachStatus($(val), helper);
    });
  }
}

export default {
  name: "insert-bbb",

  initialize() {
    withPluginApi("0.8.31", (api) => {
      const currentUser = api.getCurrentUser();
      const siteSettings = api.container.lookup("site-settings:main");

      api.decorateCooked(attachBBB, {
        id: "discourse-bbb",
      });

      if (
        !siteSettings.bbb_staff_only ||
        (siteSettings.bbb_staff_only && currentUser && currentUser.staff)
      ) {
        api.modifyClass("controller:composer", {
          actions: {
            insertBBBModal() {
              showModal("insert-bbb").setProperties({
                toolbarEvent: this.get("toolbarEvent"),
              });
            },
          },
        });

        api.addToolbarPopupMenuOptionsCallback((controller) => {
          return {
            id: "insert-bbb",
            icon: "video",
            action: "insertBBBModal",
            label: "bbb.composer_title",
          };
        });
      }
    });
  },
};
