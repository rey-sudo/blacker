import 'package:flutter/material.dart';

class PaginaUno extends StatelessWidget {
  const PaginaUno({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Página Uno")),
      body: Center(
        child: ElevatedButton(
          child: const Text("Volver"),
          onPressed: () => Navigator.pop(context),
        ),
      ),
    );
  }
}
