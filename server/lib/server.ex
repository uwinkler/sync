defmodule Server do
  def start(_type, _args) do
    init()
  end

  def init do
    :fs.start_link(:fs_watcher, "/tmp")
    :fs.subscribe(:fs_watcher)
    :fs.start_looper()
    # listen()
  end

  def listen do
    IO.puts("Listening for events...")

    receive do
      {_, event} ->
        IO.inspect(event)
    end
  end
end
