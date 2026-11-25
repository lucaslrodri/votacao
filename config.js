// A URL do app da Web do Google Apps Script (apps-script/Codigo.gs) que guarda as camisas do grupo e os corações na
// planilha (termina em /exec). Como conseguir: LEIAME.md. Enquanto estiver vazia, a página abre (depois do login), mas
// a lista "Camisas do grupo", o botão de salvar e os corações ficam desligados.
window.URL_CAMISAS = "https://script.google.com/macros/s/AKfycby42zsYbRBzjYL7PeaV4ogP9Evuv9laTQtoT7ElU9m4-OrDVn27xKMedU_EK6S6hjmZ3Q/exec";
// O ID do cliente OAuth do Google (termina em .apps.googleusercontent.com), para o "Fazer login com o Google": a
// página só abre depois do login. O mesmo ID vai em CLIENTE_GOOGLE, no Apps Script. É o mesmo da votação do logo
// (projeto do Google Cloud votacao-logo-pei); o endereço do site precisa estar nas origens autorizadas dele (LEIAME.md).
window.CLIENTE_GOOGLE = "129979775868-s8hofjoin16lvroc5gdervjnk1dt1144.apps.googleusercontent.com";
// O formulário da cor (Google Forms "Camisa do PEI: azul ou preta?", no Drive de Lucas, 25/11/2026): quem quer a
// Clássica azul ou a preta. E-mail verificado (login do Google), uma resposta por conta, que pode ser editada. O link
// de cada cor já abre com a cor marcada (ENTRADA_COR é o campo da pergunta "Qual cor você quer?").
window.FORM_COR = "https://docs.google.com/forms/d/e/1FAIpQLSfyQDufFaR-UdtSH3d78cZfOzFvwPWmIZ0G73bWAmpor8RAnw/viewform";
window.ENTRADA_COR = "entry.185439491";
// A lista pública dos pedidos (nome e cor, sem e-mail): a aba "Público (site)" da planilha de respostas do formulário
// ("Camisa do PEI: azul ou preta? (respostas)", no Drive de Lucas), publicada na Web em CSV. Só essa aba está
// publicada; a aba das respostas, com os e-mails, não. O Google atualiza o CSV publicado em alguns minutos.
window.CSV_PEDIDOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8uorTfsRtMpnfGjzfAPkzUCLBxqnlfZvSMquo0THt8JiFZHVju_YGEs5IOkUOfoNPQWIyep7XOttf/pub?gid=824142083&single=true&output=csv";
