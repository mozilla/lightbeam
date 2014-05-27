var openLightbeamButton = document.querySelector('button#openLightbeam');
if (openLightbeamButton) {
  openLightbeamButton.addEventListener('click', function () {
    self.port.emit('openLightbeam', {});
  });
}
