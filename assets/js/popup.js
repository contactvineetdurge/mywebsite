// Open popup
$("#callMeBtn").click(function(e) {
  e.stopPropagation();
  $("#popup").removeClass("hidden");
});

// Close popup when clicking outside
$(document).on("click", "#popup", function(e) {
  if ($(e.target).closest(".popup-content").length === 0) {
    $("#popup").addClass("hidden");
  }
});
