/* La Carta de seguridad y cobertura médica que se firma en línea.
   La genera el programa del gimnasio (herramientas/carta-a-landing.js)
   a partir de la versión impresa. No se edita a mano: si cambia una letra,
   el programa ya no la reconoce como la v1.2. */
window.CARTA_SEGURIDAD = {
  "documento": "carta-seguridad",
  "version": "1.2",
  "titulo": "Carta de seguridad y cobertura médica",
  "aviso": "Se firma al inscribir · sin esta hoja el alumno no entrena",
  "encabezado": [
    "Alumno",
    "Edad",
    "Grupo / horario",
    "Fecha",
    "Padre, madre o tutor que firma",
    "Emergencia 1 · nombre, parentesco y teléfono",
    "Emergencia 2 · nombre, parentesco y teléfono",
    "Tipo de sangre"
  ],
  "secciones": [
    {
      "n": 1,
      "titulo": "El riesgo de este deporte",
      "parrafos": [
        "La gimnasia artística es un **deporte de riesgo**: se entrena en altura, en inversión y sobre superficies estrechas. Aun con la técnica correcta, la progresión adecuada y la asistencia del entrenador, **existe posibilidad real de lesión**, de leve a grave. Como padre, madre o tutor, **declaro conocer y aceptar ese riesgo inherente**, y que lo he hablado con el alumno en los términos que puede entender según su edad."
      ]
    },
    {
      "n": 2,
      "titulo": "Lo que REIVAJ hace para reducirlo",
      "lista": [
        "Revisión diaria de aparatos, anclajes y colchonetas antes del primer turno.",
        "Calentamiento completo y supervisado en toda clase.",
        "Progresiones técnicas: ningún elemento se enseña saltándose pasos.",
        "Asistencia del entrenador y protección con colchoneta, foso o pista.",
        "Botiquín de primeros auxilios equipado y revisado cada mes, y personal con certificación vigente para usarlo.",
        "Protocolo escrito de lesión, con aviso al tutor y bitácora firmada."
      ],
      "parrafos": [
        "Ninguna de estas medidas elimina el riesgo del deporte; lo reducen. REIVAJ responde por el cumplimiento de estas medidas."
      ]
    },
    {
      "n": 3,
      "titulo": "Seguro de accidentes — decisión del tutor",
      "recuadro": {
        "titulo": "La afiliación federativa y el carnet no incluyen gastos médicos",
        "texto": "El carnet y la afiliación habilitan al alumno para competir, **pero no cubren la atención médica de una lesión**. REIVAJ ofrece aparte un **seguro de accidentes de contratación voluntaria**, con Seguros SURA:"
      },
      "cuadro": [
        [
          "Aseguradora",
          "Seguros SURA, S.A. de C.V."
        ],
        [
          "Póliza",
          "17162 · ramo 605 · accidentes personales colectivo"
        ],
        [
          "Costo",
          "**$650.00** al año, por alumno · **proporcional** si entra después"
        ],
        [
          "Vigencia",
          "del **8 de agosto al 8 de agosto** · hoy, 08/08/2026 a 08/08/2027"
        ],
        [
          "Suma asegurada",
          ""
        ],
        [
          "Dónde aplica",
          ""
        ]
      ],
      "opciones": {
        "si": "**Sí contrato** el seguro de accidentes que ofrece REIVAJ. Importe que pago hoy: **$__________**",
        "no": "**No lo contrato.**"
      },
      "parrafos": [
        "**Si lo contrato**, entiendo que va aparte de la mensualidad; que **la póliza corre del 8 de agosto al 8 de agosto**, así que si el alumno se da de alta a mitad del año pago **solo la parte proporcional hasta el 8 de agosto siguiente**; que la cobertura empieza desde el alta en la póliza y no desde hoy; y que las exclusiones las fija la aseguradora, no REIVAJ. Siniestros: **800 911 7692**.",
        "**Si no lo contrato**, declaro que se me informó de su existencia y **de su costo y su cobertura, los del cuadro de arriba**, que decidí libremente no contratarlo, y que **los gastos médicos derivados de cualquier lesión del alumno corren por mi cuenta**. Entiendo que puedo contratarlo después, en cualquier momento, avisando a la Dirección."
      ]
    },
    {
      "n": 4,
      "titulo": "Atención de urgencia",
      "parrafos": [
        "Autorizo a REIVAJ a **solicitar atención médica de urgencia** para el alumno cuando sea necesario, y a trasladarlo al servicio médico más cercano o al indicado en su ficha médica, aun si no logran localizarme en el momento. Autorizo también que, en lo que llega ese servicio, el personal del gimnasio con certificación vigente le preste **los primeros auxilios** que la situación exija. Declaro que los datos médicos que asiento abajo son **completos y veraces**, y me obligo a informar por escrito cualquier cambio en alergias, padecimientos, medicamentos o restricciones físicas."
      ],
      "campos": [
        "Alergias (a qué)",
        "Padecimientos o lesiones previas",
        "Medicamentos que toma",
        "Servicio médico (IMSS, seguro, hospital)",
        "N.º de afiliación"
      ]
    },
    {
      "n": 5,
      "titulo": "Alcance de esta carta, y quién la firma",
      "parrafos": [
        "Esta carta acredita que fui informado del riesgo del deporte, de las medidas de seguridad del gimnasio y del costo y la cobertura del seguro, y deja constancia de mi decisión sobre él. **No es una renuncia de derechos:** no libera a REIVAJ de sus obligaciones de seguridad, no limita las responsabilidades que la ley le impone y no afecta los derechos del alumno, que son irrenunciables.",
        "**Ejerzo la patria potestad o la tutela** del alumno y estoy facultado para firmar esto; si hay resolución judicial sobre custodia o convivencia, ya entregué copia a la Dirección. Esta carta se firma de nuevo **cada ciclo y cuando el alumno suba de nivel**: el riesgo del nivel al que entra no es el que firmo hoy. Mientras tanto rige la última firmada, y la decisión sobre el seguro puede cambiarse por escrito cuando quiera."
      ]
    }
  ],
  "firmas": [
    [
      "Padre, madre o tutor",
      "Nombre completo y firma"
    ],
    [
      "Recibió por REIVAJ",
      "Nombre, firma y fecha"
    ]
  ],
  "cierre": "Se firma un ejemplar para el expediente del alumno y se entrega copia a la familia.",
  "pie": "REIVAJ Gimnasia Artística · Carta de seguridad y cobertura médica · v1.2",
  "enLinea": "Firmo esta carta de forma electrónica: el trazo que dibujé, mi nombre y la fecha y hora de envío expresan mi consentimiento igual que mi firma en papel. Recibo copia de esta carta al enviarla."
};
