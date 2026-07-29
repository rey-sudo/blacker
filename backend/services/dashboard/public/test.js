let timer = null;

self.onmessage = function(e) {
  if (e.data === 'empezar') {
    timer = setInterval(() => {
      self.postMessage('trabajando');
    }, 500); // Envía un mensaje cada segundo
  } 
  
  if (e.data === 'parar') {
    clearInterval(timer);
  }
};