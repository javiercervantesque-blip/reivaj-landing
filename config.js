/* =========================================================
   REIVAJ · Configuración de la página
   Lo único que se edita a mano. Lo demás sale del programa del gimnasio.
   ========================================================= */
window.CONFIG = {
  // WhatsApp del gimnasio: 52 + número a 10 dígitos, solo números.
  whatsapp: '523334566544',

  // El buzón hacia el programa del gimnasio (la "URL de la aplicación web"
  // de Apps Script, termina en /exec) y la llave pública del programa.
  // Los dos los da el programa en Configuración → Conexión con la página.
  // Mientras estén vacíos, los formularios mandan la solicitud por WhatsApp.
  buzon: 'https://script.google.com/macros/s/AKfycbxqK1gv7hvZfErf6J1NKiq4atqXOp4o8TsAwexGiJmDHB6y5JNc5TY9_RBBnnceD23u3w/exec',
  llavePublica: 'MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA6q3YlJfQ7TGcWDzH21WljIlP6VUI7AwKvnShaOmmWi8nXecqecMfwcTLTzKX6Eg4d2T1FAFFGo8FqcrtmhtMbC9Bq/ndLm0NPuwP0j9mSUbVmRRW3FY3BIdrb27apW+IsrR6L6kyAo05knyhxpSoLthRAHhEhzSmcX7M0Y6V2oKEZMeMhHkbvNUNu6zqGpsE4yogGvcnurr2KHedydIPEragBSKqXNTW3dblOyDFpfiHHk0FXuU9+Igy0xgH2ws1uF6XvE21/NG4GPbMZNFpK4LAZGecVGk2Bjq7AXszL9s2DOnDHOfMZO0MaU2xojnqIXbK0dfaEsvIOA2kQyU7XsFUob6UVQUf84uEK3Il6qB2Duc/u2JHvbIB0XVUjb29asPFLTwNEQLwPX1tXC/rcyBcCns9ReiiSm2CUEvRZyzeEfLusSwzHUWW1Oatmdx4kp4ODxWxuTbgL0zyT3sysf0+FyQojO0EbHj4vmdyI55Owk39sLEj0sSSgM9nefqvAgMBAAE=',  // huella bcd9b9995d9d

  // La clase de prueba. Si el programa está conectado, la página usa lo que
  // tenga el programa; esto es solo el respaldo.
  pruebas: {
    dias: [1, 2, 3, 4, 5],   // 1 = lunes … 5 = viernes
    hora: '16:00',
    horaFin: '17:00',
    horasNinos: ['16:00', '18:00'],  // los niños escogen una; las niñas van a la hora de arriba
    semanasAdelante: 3,
    sinClase: []             // fechas 'AAAA-MM-DD' sin clase de prueba
  }
};
